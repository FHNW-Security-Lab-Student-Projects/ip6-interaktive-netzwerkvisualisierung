import cytoscape from 'cytoscape';
import type { AnyTypedNode, TypedCytoscapeEdge, HierarchyLevel, NodeData } from './node-factory.ts';
import type { LayoutProvider } from './layout-utils.ts';

let activeLayout: cytoscape.Layouts | null = null;

// Iteratively nudges sibling compound bounding boxes apart until no overlaps remain.
// Nested compounds (one is ancestor of the other) are intentionally skipped.
function separateSiblingCompounds(cy: cytoscape.Core): void {
  const compounds = cy.nodes(':parent:not(.collapsed)').toArray() as cytoscape.NodeSingular[];
  if (compounds.length < 2) return;

  let changed = true;
  let iterations = 0;
  while (changed && iterations++ < 20) {
    changed = false;
    for (let i = 0; i < compounds.length; i++) {
      for (let j = i + 1; j < compounds.length; j++) {
        const a = compounds[i];
        const b = compounds[j];
        if (a.ancestors().has(b) || b.ancestors().has(a)) continue;

        const bbA = a.boundingBox({});
        const bbB = b.boundingBox({});
        const overlapX = Math.min(bbA.x2, bbB.x2) - Math.max(bbA.x1, bbB.x1);
        const overlapY = Math.min(bbA.y2, bbB.y2) - Math.max(bbA.y1, bbB.y1);
        if (overlapX <= 0 || overlapY <= 0) continue;

        changed = true;
        const margin = 20;
        const cAx = (bbA.x1 + bbA.x2) / 2;
        const cAy = (bbA.y1 + bbA.y2) / 2;
        const cBx = (bbB.x1 + bbB.x2) / 2;
        const cBy = (bbB.y1 + bbB.y2) / 2;

        let dx = 0, dy = 0;
        if (overlapX < overlapY) {
          const push = (overlapX + margin) / 2;
          dx = cAx < cBx ? -push : push;
        } else {
          const push = (overlapY + margin) / 2;
          dy = cAy < cBy ? -push : push;
        }

        // To move a compound, shift all its leaf descendants (compound positions derive from children).
        a.descendants().not(':parent').shift({ x: dx, y: dy });
        b.descendants().not(':parent').shift({ x: -dx, y: -dy });
      }
    }
  }
}

function capturePositions(cy: cytoscape.Core): Map<string, cytoscape.Position> {
  const positions = new Map<string, cytoscape.Position>();
  cy.nodes(':visible').forEach(n => {
    positions.set((n as cytoscape.NodeSingular).id(), (n as cytoscape.NodeSingular).position());
  });
  return positions;
}

function runExpandCollapseLayout(
  cy: cytoscape.Core,
  layout: LayoutProvider,
  snapshot: Map<string, cytoscape.Position>,
  anchorId: string,
): void {
  layout.register();

  const bubbleZone = new Set<string>();
  cy.$id(anchorId).neighborhood('node').forEach(n => {
    if (snapshot.has((n as cytoscape.NodeSingular).id())) {
      bubbleZone.add((n as cytoscape.NodeSingular).id());
    }
  });

  // Lock outer nodes at their saved positions before running the layout so
  // fCOSE treats them as fixed anchors. Without this, fCOSE moves them during
  // the run and places the expanded children relative to those shifted positions;
  // restoring the outer nodes afterwards then creates edge crossings because the
  // children were optimised against the wrong coordinates.
  const locked: string[] = [];
  snapshot.forEach((pos, nodeId) => {
    if (!bubbleZone.has(nodeId) && nodeId !== anchorId) {
      const node = cy.$id(nodeId);
      if (!node.length) return;
      (node as cytoscape.NodeSingular).position(pos);
      (node as cytoscape.NodeSingular).lock();
      locked.push(nodeId);
    }
  });

  const options = { ...layout.expandCollapse(), randomize: false };
  const layoutInstance = cy.layout(options);

  layoutInstance.on('layoutstop', () => {
    locked.forEach(nodeId => {
      const node = cy.$id(nodeId);
      if (node.length) (node as cytoscape.NodeSingular).unlock();
    });
    separateSiblingCompounds(cy);
  });

  activeLayout?.stop();
  activeLayout = layoutInstance;
  layoutInstance.run();
}

function getInitialNodes(rootNodes: AnyTypedNode[], hierarchy?: HierarchyLevel[]): AnyTypedNode[] {
  if (!hierarchy || hierarchy.length === 0) return rootNodes;
  for (let i = 0; i < hierarchy.length; i++) {
    const atLevel = rootNodes.filter(n => hierarchy[i].matches(n.data));
    if (atLevel.length > 0) {
      // Also include root nodes that don't match this level or any higher level: they're standalone (e.g. switches in a graph that also has root-level routers).
      const coveredIds = new Set(
        rootNodes
          .filter(n => hierarchy.slice(0, i + 1).some(l => l.matches(n.data)))
          .map(n => n.data.id),
      );
      const standalone = rootNodes.filter(n => !coveredIds.has(n.data.id));
      return [...atLevel, ...standalone];
    }
  }
  return rootNodes;
}

export interface ExpandCollapseOptions {
  onNodeClick?: (nodeId: string, isCompound: boolean) => void;
  onExpand?: (nodeId: string) => void;
}

// Wires up interactive expand/collapse for compound nodes.
// Owns graph population: starts with root nodes only, adds/removes children on expand/collapse.
// Tap collapsed node -> add children + animate layout.
// Tap expanded compound label -> remove descendants + animate layout.
// initialExpand: 'none' (default) | 'all' | HierarchyLevel label to expand down to on load.
export function setupExpandCollapse(
  cy: cytoscape.Core,
  nodes: AnyTypedNode[],
  edges: TypedCytoscapeEdge[],
  layout: LayoutProvider,
  hierarchy?: HierarchyLevel[],
  initialExpand?: string | 'all' | 'none',
  options?: ExpandCollapseOptions,
): void {
  function getDirectChildren(nodeId: string): AnyTypedNode[] {
    return nodes.filter(n => n.data.parent === nodeId);
  }

  function getAllDescendants(nodeId: string): AnyTypedNode[] {
    const direct = getDirectChildren(nodeId);
    return direct.flatMap(child => [child, ...getAllDescendants(child.data.id)]);
  }

  function isExpandable(nodeId: string): boolean {
    return getDirectChildren(nodeId).length > 0;
  }

  // Returns the deepest visible ancestor of nodeId, or null. Used to lift edges into collapsed compounds.
  function getRepresentative(nodeId: string): string | null {
    if (cy.$id(nodeId).length > 0) return nodeId;
    const nodeData = nodes.find(n => n.data.id === nodeId)?.data;
    if (!nodeData?.parent) return null;
    return getRepresentative(nodeData.parent);
  }

  // Rebuilds all edges: lifts endpoints inside collapsed compounds to their nearest visible ancestor,
  // deduplicates, and skips parent<->child edges (implicit from containment).
  // Must run outside cy.batch() so ancestor() lookups reflect committed state.
  function syncEdges(): void {
    cy.edges().remove();
    const addedPairs = new Set<string>();
    edges.forEach(edge => {
      const repSrc = getRepresentative(edge.data.source);
      const repTgt = getRepresentative(edge.data.target);
      if (!repSrc || !repTgt || repSrc === repTgt) return;
      if (repSrc === edge.data.source && repTgt === edge.data.target) {
        const src = cy.$id(repSrc);
        const tgt = cy.$id(repTgt);
        if (src.ancestors().has(tgt) || tgt.ancestors().has(src)) return;
      }
      const pairKey = [repSrc, repTgt].sort().join('\0');
      if (addedPairs.has(pairKey)) return;
      addedPairs.add(pairKey);
      const isOriginal = repSrc === edge.data.source && repTgt === edge.data.target;
      cy.add({
        data: {
          ...edge.data,
          id: isOriginal ? edge.data.id : `__lifted__${pairKey}`,
          source: repSrc,
          target: repTgt,
        },
        ...(edge.classes !== undefined ? { classes: edge.classes } : {}),
      } as cytoscape.ElementDefinition);
    });
  }

  // Saved positions: restores layout on re-expand without recalculating from scratch.
  const savedPositions = new Map<string, cytoscape.Position>();

  // Expanded nodes within a collapsed subtree, restored on re-expand to preserve depth.
  const savedExpanded = new Set<string>();

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
        if (isExpandable(child.data.id)) cy.$id(child.data.id).addClass('collapsed');
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
    });
    syncEdges();
  }

  // Start with only the outermost hierarchy level present among root nodes.
  const allRootNodes = nodes.filter(n => n.data.parent === undefined);
  const rootNodes = getInitialNodes(allRootNodes, hierarchy);
  cy.add(rootNodes as cytoscape.ElementDefinition[]);
  rootNodes.forEach(n => {
    if (isExpandable(n.data.id)) cy.$id(n.data.id).addClass('collapsed');
  });
  syncEdges();

  if (initialExpand && initialExpand !== 'none') {
    if (initialExpand === 'all') {
      let collapsed = cy.nodes('.collapsed').toArray() as cytoscape.NodeSingular[];
      while (collapsed.length > 0) {
        collapsed.forEach(n => doExpand(n));
        collapsed = cy.nodes('.collapsed').toArray() as cytoscape.NodeSingular[];
      }
    } else {
      // Expand levels \leq target repeatedly; each expand may reveal more nodes at the same level.
      const targetIndex = hierarchy?.findIndex(l => l.label === initialExpand) ?? -1;
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

  // Prevent the browser's native context menu on the canvas.
  cy.container()?.addEventListener('contextmenu', e => e.preventDefault());

  // Right-click: expand collapsed compound / collapse expanded compound.
  cy.on('cxttap', 'node', event => {
    event.stopPropagation();
    const node = event.target as cytoscape.NodeSingular;

    if (node.hasClass('collapsed')) {
      const snapshot = capturePositions(cy);
      doExpand(node);
      runExpandCollapseLayout(cy, layout, snapshot, node.id());
      options?.onExpand?.(node.id());
      return;
    }

    if (node.isParent()) {
      doCollapse(node);
    }
  });

  // Left-click: fire onNodeClick for any node (leaf or compound).
  cy.on('tap', 'node', event => {
    event.stopPropagation();
    const node = event.target as cytoscape.NodeSingular;
    const isCompound = node.isParent() || node.hasClass('collapsed');
    options?.onNodeClick?.(node.id(), isCompound);
  });
}
