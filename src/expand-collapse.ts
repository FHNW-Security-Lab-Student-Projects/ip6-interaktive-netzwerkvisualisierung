import cytoscape from 'cytoscape';
import type { AnyTypedNode, TypedCytoscapeEdge, HierarchyLevel, NodeData } from './node-factory.ts';
import type { LayoutProvider } from './layout-utils.ts';
import {
  separateSiblingCompounds,
  capturePositions,
  runExpandCollapseLayout,
  getActiveLayout,
  setActiveLayout,
  stopActiveLayout,
} from './expand-collapse/layout.ts';
import {
  getDirectChildren as childrenOf,
  getAllDescendants as descendantsOf,
  getInitialNodes,
} from './expand-collapse/tree.ts';
import { syncEdges as syncEdgesImpl } from './expand-collapse/edges.ts';
import { setupContextMenu } from './expand-collapse/context-menu.ts';

export interface ExpandCollapseOptions {
  onNodeClick?: (nodeId: string, isCompound: boolean) => void;
  onExpand?: (nodeId: string) => void;
  onCollapse?: (nodeId: string) => void;
  onCompare?: (nodeId: string, nodeType: string) => void;
  onCompareHas?: (nodeId: string) => boolean;
}

export interface ExpandCollapseController {
  expandToLevel: (level: string | 'all' | 'none') => void;
  focusNode: (nodeId: string) => void;
  highlightNodes: (ids: string[]) => void;
  clearHighlights: () => void;
  getDirectChildCount: (nodeId: string) => number;
  getDirectChildren: (nodeId: string) => AnyTypedNode[];
  reset: (newNodes: AnyTypedNode[], newEdges: TypedCytoscapeEdge[], expandLevel?: string | 'all' | 'none') => void;
}

// Wires up interactive expand/collapse for compound nodes.
// Owns graph population: starts with root nodes only, adds/removes children on expand/collapse.
// Tap collapsed node -> add children + animate layout.
// Tap expanded compound label -> remove descendants + animate layout.
// initialExpand: 'none' (default) | 'all' | HierarchyLevel label to expand down to on load.
export function setupExpandCollapse(
  cy: cytoscape.Core,
  initialNodes: AnyTypedNode[],
  initialEdges: TypedCytoscapeEdge[],
  layout: LayoutProvider,
  hierarchy?: HierarchyLevel[],
  initialExpand?: string | 'all' | 'none',
  options?: ExpandCollapseOptions,
): ExpandCollapseController {
  let nodes = initialNodes;
  let edges = initialEdges;

  function getDirectChildren(nodeId: string): AnyTypedNode[] {
    return childrenOf(nodes, nodeId);
  }

  function getAllDescendants(nodeId: string): AnyTypedNode[] {
    return descendantsOf(nodes, nodeId);
  }

  function isExpandable(nodeId: string): boolean {
    return getDirectChildren(nodeId).length > 0;
  }

  function setCollapsedCount(node: cytoscape.NodeSingular): void {
    node.data('collapsedChildCount', getDirectChildren(node.id()).length);
  }

  function syncEdges(): void {
    syncEdgesImpl(cy, nodes, edges);
  }

  // Saved positions: restores layout on re-expand without recalculating from scratch.
  const savedPositions = new Map<string, cytoscape.Position>();

  // Expanded nodes within a collapsed subtree, restored on re-expand to preserve depth.
  const savedExpanded = new Set<string>();

  // Tracks the active dropdown level so expandToLevel can detect direction of change.
  let currentLevel: string | 'all' | 'none' = initialExpand ?? 'none';

  // Snapshot of top-level node positions before any expand; used to restore 'none' state exactly.
  const initialPositions: Record<string, cytoscape.Position> = {};
  cy.nodes(':visible').forEach(n => {
    initialPositions[(n as cytoscape.NodeSingular).id()] = (n as cytoscape.NodeSingular).position();
  });

  // Expands a collapsed node and recursively restores previously-expanded children.
  function doExpand(node: cytoscape.NodeSingular): void {
    const children = getDirectChildren(node.id());
    const parentPos = node.position();

    // Batch to skip the intermediate (0,0) state; syncEdges runs after so ancestor() is current.
    cy.batch(() => {
      cy.add(children as cytoscape.ElementDefinition[]);
      children.forEach(child => {
        // Restore saved position if known; otherwise jitter slightly around parent so fCOSE
        // repulsion forces have a direction to work with (pure pile = degenerate config).
        const jitter = () => (Math.random() - 0.5) * 20;
        const pos = savedPositions.get(child.data.id) ?? { x: parentPos.x + jitter(), y: parentPos.y + jitter() };
        (cy.$id(child.data.id) as cytoscape.NodeSingular).position(pos);
        if (isExpandable(child.data.id)) {
          cy.$id(child.data.id).addClass('collapsed');
          setCollapsedCount(cy.$id(child.data.id) as cytoscape.NodeSingular);
        }
      });
      node.removeClass('collapsed');
    });
    syncEdges();

    children.forEach(child => {
      if (savedExpanded.has(child.data.id)) {
        savedExpanded.delete(child.data.id);
        doExpand(cy.$id(child.data.id) as cytoscape.NodeSingular);
      }
    });
  }

  function doCollapse(node: cytoscape.NodeSingular): void {
    getAllDescendants(node.id()).forEach(desc => {
      const descNode = cy.$id(desc.data.id) as cytoscape.NodeSingular;
      if (descNode.length) {
        savedPositions.set(desc.data.id, descNode.position());
        if (descNode.isParent() && !descNode.hasClass('collapsed')) {
          savedExpanded.add(desc.data.id);
        }
      }
    });
    cy.batch(() => {
      // Remove in reverse order (leaves first) so compound sizing updates cleanly.
      getAllDescendants(node.id()).reverse().forEach(desc => {
        cy.$id(desc.data.id).remove();
      });
      node.addClass('collapsed');
      setCollapsedCount(node);
    });
    syncEdges();
  }

  function doExpandAll(node: cytoscape.NodeSingular): void {
    doExpand(node);
    let collapsed = node.descendants('.collapsed') as cytoscape.NodeCollection;
    while (collapsed.length > 0) {
      collapsed.forEach(n => doExpand(n as cytoscape.NodeSingular));
      collapsed = node.descendants('.collapsed');
    }
  }

  function doCollapseAll(node: cytoscape.NodeSingular): void {
    doCollapse(node);
    // Clear savedExpanded for all descendants so re-expanding shows them as collapsed pills.
    getAllDescendants(node.id()).forEach(desc => savedExpanded.delete(desc.data.id));
  }

  // Start with only the outermost hierarchy level present among root nodes.
  const allRootNodes = nodes.filter(n => n.data.parent === undefined);
  const rootNodes = getInitialNodes(allRootNodes, hierarchy);
  cy.add(rootNodes as cytoscape.ElementDefinition[]);
  rootNodes.forEach(n => {
    if (isExpandable(n.data.id)) {
      const cyNode = cy.$id(n.data.id) as cytoscape.NodeSingular;
      cyNode.addClass('collapsed');
      setCollapsedCount(cyNode);
    }
  });
  syncEdges();

  function applyInitialExpand(level: string | 'all' | 'none'): void {
    if (!level || level === 'none') return;
    if (level === 'all') {
      let collapsed = cy.nodes('.collapsed').toArray() as cytoscape.NodeSingular[];
      while (collapsed.length > 0) {
        collapsed.forEach(n => doExpand(n));
        collapsed = cy.nodes('.collapsed').toArray() as cytoscape.NodeSingular[];
      }
    } else {
      // Expand levels <= target repeatedly; each expand may reveal more nodes at the same level.
      const targetIndex = hierarchy?.findIndex(l => l.label === level) ?? -1;
      const shouldExpand = (data: NodeData) =>
        hierarchy!.slice(0, targetIndex + 1).some(l => l.matches(data));
      let toExpand = cy.nodes('.collapsed').filter(n => {
        const data = nodes.find(nd => nd.data.id === n.id())?.data;
        return data ? shouldExpand(data) : false;
      });
      while (toExpand.length > 0) {
        toExpand.forEach(n => doExpand(n));
        toExpand = cy.nodes('.collapsed').filter(n => {
          const data = nodes.find(nd => nd.data.id === n.id())?.data;
          return data ? shouldExpand(data) : false;
        });
      }
    }
  }

  applyInitialExpand(initialExpand ?? 'none');

  function levelIndex(l: string | 'all' | 'none'): number {
    if (!l || l === 'none') return -1;
    if (l === 'all') return hierarchy?.length ?? 0;
    return hierarchy?.findIndex(h => h.label === l) ?? -1;
  }

  // Prevent the browser's native context menu on the canvas.
  cy.container()?.addEventListener('contextmenu', e => e.preventDefault());
  setupContextMenu(cy, { layout, options, doExpandAll, doCollapseAll, focusNode });

  // Double-click: expand collapsed compound / collapse expanded compound.
  // Declared here so the tap handler below can cancel it on double-click.
  let tapTimer: ReturnType<typeof setTimeout> | null = null;

  cy.on('dbltap', 'node', event => {
    event.stopPropagation();
    if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
    const node = event.target as cytoscape.NodeSingular;

    if (node.hasClass('collapsed')) {
      const snapshot = capturePositions(cy);
      doExpand(node);
      runExpandCollapseLayout(cy, layout, snapshot, node.id(), true);
      options?.onExpand?.(node.id());
      options?.onNodeClick?.(node.id(), true);
      return;
    }

    if (node.isParent()) {
      doCollapse(node);
      options?.onCollapse?.(node.id());
      options?.onNodeClick?.(node.id(), true);
    }
  });

  // Single-click: fire onNodeClick for any node (leaf or compound).
  // Debounced so a double-click can cancel it before the panel opens.
  cy.on('tap', 'node', event => {
    event.stopPropagation();
    const node = event.target as cytoscape.NodeSingular;
    const isCompound = node.isParent() || node.hasClass('collapsed');
    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      tapTimer = null;
      options?.onNodeClick?.(node.id(), isCompound);
    }, 250);
  });

  function focusNode(nodeId: string): void {
    stopActiveLayout();
    cy.stop();

    const chain: string[] = [];
    let cur = nodes.find(n => n.data.id === nodeId);
    while (cur?.data.parent) {
      chain.unshift(cur.data.parent);
      cur = nodes.find(n => n.data.id === cur!.data.parent);
    }

    const snapshot = capturePositions(cy);
    let didExpand = false;
    chain.forEach(ancestorId => {
      const ancestor = cy.$id(ancestorId) as cytoscape.NodeSingular;
      if (ancestor.length && ancestor.hasClass('collapsed')) {
        doExpand(ancestor);
        didExpand = true;
      }
    });

    // Expand the target itself if it's a collapsed compound, so the panel shows real info.
    const selfNode = cy.$id(nodeId) as cytoscape.NodeSingular;
    if (selfNode.length && selfNode.hasClass('collapsed')) {
      doExpand(selfNode);
      didExpand = true;
    }

    const selectAndPan = () => {
      const target = cy.$id(nodeId) as cytoscape.NodeSingular;
      if (target.length) {
        cy.animate({ zoom: Math.max(cy.zoom(), 1.5), center: { eles: target }, duration: 400 });
        cy.nodes().unselect();
        target.select();
        target.emit('tap');
      }
    };

    if (!didExpand) {
      // Node is already visible and expanded — skip layout, pan and select immediately.
      selectAndPan();
      return;
    }

    const anchorId = chain.at(-1) ?? nodeId;
    runExpandCollapseLayout(cy, layout, snapshot, anchorId, false, selectAndPan);
  }

  return {
    focusNode,

    expandToLevel(level: string | 'all' | 'none'): void {
      // Null the sentinel BEFORE stopping so in-flight layoutstop handlers detect cancellation.
      const prevLayout = getActiveLayout();
      setActiveLayout(null);
      prevLayout?.stop();

      if (levelIndex(level) <= levelIndex(currentLevel)) {
        // Going shallower or same: collapse everything and start fresh.
        cy.nodes(':parent:not(.collapsed)').filter(n => !(n as cytoscape.NodeSingular).isChild()).forEach(n => {
          doCollapse(n as cytoscape.NodeSingular);
        });
        savedExpanded.clear();
        savedPositions.clear();
      }
      // Going deeper: existing expanded compounds stay in place; applyInitialExpand
      // finds only the newly-visible collapsed nodes and expands them.

      // Returning to 'none': restore the exact initial positions rather than re-running layout.
      if (level === 'none') {
        currentLevel = level;
        cy.layout({ name: 'preset', positions: initialPositions }).run();
        return;
      }

      applyInitialExpand(level);
      currentLevel = level;

      layout.register();
      const layoutOpts = { ...layout.expandCollapse(), randomize: false };
      const layoutInstance = cy.layout(layoutOpts);
      setActiveLayout(layoutInstance);

      layoutInstance.on('layoutstop', () => {
        if (getActiveLayout() === layoutInstance) {
          separateSiblingCompounds(cy);
        }
      });

      layoutInstance.run();
    },

    highlightNodes(ids: string[]): void {
      stopActiveLayout();
      cy.stop();
      cy.nodes().removeClass('highlight').unselect();

      let didExpand = false;
      const alreadyExpanded = new Set<string>();

      for (const id of ids) {
        const chain: string[] = [];
        let cur = nodes.find(n => n.data.id === id);
        while (cur?.data.parent) {
          chain.unshift(cur.data.parent);
          cur = nodes.find(n => n.data.id === cur!.data.parent);
        }
        for (const ancestorId of chain) {
          if (alreadyExpanded.has(ancestorId)) continue;
          alreadyExpanded.add(ancestorId);
          const ancestor = cy.$id(ancestorId) as cytoscape.NodeSingular;
          if (ancestor.length && ancestor.hasClass('collapsed')) {
            doExpand(ancestor);
            didExpand = true;
          }
        }
      }

      const applyHighlights = () => {
        ids.forEach(id => {
          const node = cy.$id(id) as cytoscape.NodeSingular;
          if (node.length) node.addClass('highlight');
        });
        const highlighted = cy.nodes('.highlight');
        if (highlighted.length > 0) {
          cy.animate({ fit: { eles: highlighted, padding: 80 }, duration: 400 });
        }
      };

      if (!didExpand) {
        applyHighlights();
        return;
      }

      // Full layout (no zone locking) since expansions may span multiple subtrees.
      layout.register();
      const layoutOpts = { ...layout.expandCollapse(), randomize: false, fit: false };
      const layoutInstance = cy.layout(layoutOpts);
      setActiveLayout(layoutInstance);
      layoutInstance.on('layoutstop', () => {
        if (getActiveLayout() === layoutInstance) {
          separateSiblingCompounds(cy);
          applyHighlights();
        }
      });
      layoutInstance.run();
    },

    clearHighlights(): void {
      cy.nodes().removeClass('highlight');
    },

    getDirectChildCount(nodeId: string): number {
      return getDirectChildren(nodeId).length;
    },

    getDirectChildren(nodeId: string): AnyTypedNode[] {
      return getDirectChildren(nodeId);
    },

    reset(newNodes: AnyTypedNode[], newEdges: TypedCytoscapeEdge[], expandLevel: string | 'all' | 'none' = 'none'): void {
      nodes = newNodes;
      edges = newEdges;

      stopActiveLayout();
      setActiveLayout(null);
      cy.elements().remove();
      savedExpanded.clear();
      savedPositions.clear();
      currentLevel = expandLevel;

      const allRootNodes = nodes.filter(n => n.data.parent === undefined);
      const rootNodes = getInitialNodes(allRootNodes, hierarchy);
      cy.add(rootNodes as cytoscape.ElementDefinition[]);
      rootNodes.forEach(n => {
        if (isExpandable(n.data.id)) {
          const cyNode = cy.$id(n.data.id) as cytoscape.NodeSingular;
          cyNode.addClass('collapsed');
          setCollapsedCount(cyNode);
        }
      });
      syncEdges();
      applyInitialExpand(expandLevel);
    },
  };
}
