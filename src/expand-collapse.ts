import cytoscape from 'cytoscape';
import type { AnyTypedNode, TypedCytoscapeEdge, HierarchyLevel, NodeData } from './node-factory.ts';
import type { LayoutProvider } from './layout-utils.ts';

let activeLayout: cytoscape.Layouts | null = null;

// Iteratively nudges sibling compound bounding boxes apart until no overlaps remain,
// then animates from the pre-separation positions to the final ones.
// Nested compounds (one is ancestor of the other) are intentionally skipped.
function separateSiblingCompounds(cy: cytoscape.Core): void {
  const compounds = cy.nodes(':parent:not(.collapsed)').toArray() as cytoscape.NodeSingular[];
  if (compounds.length < 2) return;

  const allLeaves = cy.nodes(':parent:not(.collapsed)').descendants().not(':parent');
  const startPos = new Map<string, cytoscape.Position>();
  allLeaves.forEach(n => {
    startPos.set((n as cytoscape.NodeSingular).id(), { ...(n as cytoscape.NodeSingular).position() });
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations++ < 20) {
    changed = false;
    for (let i = 0; i < compounds.length; i++) {
      for (let j = i + 1; j < compounds.length; j++) {
        const a = compounds[i];
        const b = compounds[j];
        if (a.ancestors().has(b) || b.ancestors().has(a)) continue;
        const bbA = a.boundingBox({ includeLabels: true });
        const bbB = b.boundingBox({ includeLabels: true });
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
        a.descendants().not(':parent').shift({ x: dx, y: dy });
        b.descendants().not(':parent').shift({ x: -dx, y: -dy });
      }
    }
  }

  const endPos = new Map<string, cytoscape.Position>();
  allLeaves.forEach(n => {
    const id = (n as cytoscape.NodeSingular).id();
    endPos.set(id, { ...(n as cytoscape.NodeSingular).position() });
    (n as cytoscape.NodeSingular).position(startPos.get(id)!);
  });
  allLeaves.forEach(n => {
    const id = (n as cytoscape.NodeSingular).id();
    const s = startPos.get(id)!;
    const e = endPos.get(id)!;
    if (Math.abs(e.x - s.x) > 0.5 || Math.abs(e.y - s.y) > 0.5) {
      (n as cytoscape.NodeSingular).animate({ position: e }, { duration: 300 });
    }
  });
}

// After expanding, bring the opened compound into focus: always center it,
// and zoom out (never in) only enough to show the whole compound if it doesn't
// already fit at the current zoom.
function focusOnCompound(cy: cytoscape.Core, anchorId: string): void {
  const anchor = cy.$id(anchorId);
  if (!anchor.length) return;
  const eles = anchor.union(anchor.descendants());
  const bb = eles.boundingBox();
  const ext = cy.extent(); // viewport in model coords
  cy.stop(); // cancel any in-flight viewport pan (e.g. a prior selection) so we don't jump there first
  if (bb.w <= ext.w && bb.h <= ext.h) {
    // Already fits: keep zoom, just re-center.
    cy.animate({ center: { eles }, duration: 400 });
  } else {
    // Too big for the current zoom: zoom out just enough to fit it, centered.
    cy.animate({ fit: { eles, padding: 40 }, duration: 400 });
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
  focusOnExpand: boolean,
  onStop?: () => void,
): void {
  layout.register();

  // Bubble zone: all visible nodes inside the anchor's immediate parent compound.
  // If the anchor has no parent (root-level), fall back to edge neighbors.
  // Everything outside the bubble zone is locked so the expand stays local.
  const bubbleZone = new Set<string>();
  const anchorParent = cy.$id(anchorId).parent();
  if (anchorParent.length) {
    anchorParent.descendants().forEach(n => {
      if (snapshot.has((n as cytoscape.NodeSingular).id()))
        bubbleZone.add((n as cytoscape.NodeSingular).id());
    });
  } else {
    cy.$id(anchorId).neighborhood('node').forEach(n => {
      if (snapshot.has((n as cytoscape.NodeSingular).id()))
        bubbleZone.add((n as cytoscape.NodeSingular).id());
    });
  }

  // Lock outer leaf nodes. Compound nodes are skipped: fCOSE positions them from
  // their children, so locking only a compound parent doesn't prevent fCOSE from
  // moving its children. Locking the leaves achieves the same effect reliably.
  const locked: string[] = [];
  snapshot.forEach((pos, nodeId) => {
    if (bubbleZone.has(nodeId) || nodeId === anchorId) return;
    const node = cy.$id(nodeId) as cytoscape.NodeSingular;
    if (!node.length || node.isParent()) return;
    node.position(pos);
    node.lock();
    locked.push(nodeId);
  });

  const options = { ...layout.expandCollapse(), randomize: false, fit: false };
  const layoutInstance = cy.layout(options);

  layoutInstance.on('layoutstop', () => {
    // Always unlock so subsequent layouts can reposition these nodes.
    locked.forEach(nodeId => {
      const node = cy.$id(nodeId);
      if (node.length) (node as cytoscape.NodeSingular).unlock();
    });
    // Only run post-processing if this layout wasn't cancelled by a newer one.
    if (activeLayout === layoutInstance) {
      separateSiblingCompounds(cy);
      onStop?.();
      if (focusOnExpand) {
        focusOnCompound(cy, anchorId);
      }
    }
  });

  // Claim active before stopping the previous layout, so its re-emitted
  // layoutstop sees it's been superseded and skips its post-processing.
  const prev = activeLayout;
  activeLayout = layoutInstance;
  prev?.stop();
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
  onCollapse?: (nodeId: string) => void;
  onCompare?: (nodeId: string, nodeType: string) => void;
  onCompareHas?: (nodeId: string) => boolean;
}

export interface ExpandCollapseController {
  expandToLevel: (level: string | 'all' | 'none') => void;
  focusNode: (nodeId: string) => void;
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
    return nodes.filter(n => n.data.parent === nodeId);
  }

  function getAllDescendants(nodeId: string): AnyTypedNode[] {
    const direct = getDirectChildren(nodeId);
    return direct.flatMap(child => [child, ...getAllDescendants(child.data.id)]);
  }

  function isExpandable(nodeId: string): boolean {
    return getDirectChildren(nodeId).length > 0;
  }

  function setCollapsedCount(node: cytoscape.NodeSingular): void {
    node.data('collapsedChildCount', getDirectChildren(node.id()).length);
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
      const srcNodeData = nodes.find(n => n.data.id === edge.data.source)?.data as { device_type?: string } | undefined;
      const tgtNodeData = nodes.find(n => n.data.id === edge.data.target)?.data as { device_type?: string } | undefined;
      cy.add({
        data: {
          ...edge.data,
          id: isOriginal ? edge.data.id : `__lifted__${pairKey}`,
          source: repSrc,
          target: repTgt,
          ...(!isOriginal && {
            orig_source: edge.data.source,
            orig_target: edge.data.target,
            orig_source_device_type: srcNodeData?.device_type,
            orig_target_device_type: tgtNodeData?.device_type,
          }),
        },
        ...(edge.classes !== undefined ? { classes: edge.classes } : {}),
      } as cytoscape.ElementDefinition);
    });
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

  function setupContextMenu(): void {
    let activeMenu: HTMLElement | null = null;

    function closeMenu(): void {
      activeMenu?.remove();
      activeMenu = null;
    }

    cy.on('cxttap', 'node', event => {
      event.stopPropagation();
      closeMenu();

      const node = event.target as cytoscape.NodeSingular;
      const isCompound = node.isParent() || node.hasClass('collapsed');
      const nodeType = (node.data('node_type') as string | undefined) ?? 'device';

      const container = cy.container();
      if (!container) return;

      const rp = event.renderedPosition as { x: number; y: number };

      const menu = document.createElement('div');
      menu.className = 'ctx-menu';
      activeMenu = menu;

      if (isCompound) {
        // Use all selected compound nodes; fall back to just the right-clicked node.
        const selectedCompounds = cy.nodes(':selected').filter(
          n => (n as cytoscape.NodeSingular).isParent() || (n as cytoscape.NodeSingular).hasClass('collapsed')
        ).toArray() as cytoscape.NodeSingular[];
        const targets = selectedCompounds.length > 0 ? selectedCompounds : [node];

        const expandBtn = document.createElement('button');
        expandBtn.textContent = 'Expand all';
        expandBtn.addEventListener('click', () => {
          closeMenu();
          const snapshot = capturePositions(cy);
          targets.forEach(t => doExpandAll(t));
          runExpandCollapseLayout(cy, layout, snapshot, node.id(), true);
          options?.onExpand?.(node.id());
        });

        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = 'Collapse all';
        collapseBtn.addEventListener('click', () => {
          closeMenu();
          const snapshot = capturePositions(cy);
          targets.forEach(t => doCollapseAll(t));
          runExpandCollapseLayout(cy, layout, snapshot, node.id(), false);
        });

        menu.append(expandBtn, collapseBtn);
      }

      if (nodeType !== 'group') {
        if (menu.children.length > 0) {
          const sep = document.createElement('div');
          sep.style.cssText = 'height:1px;background:#eee;margin:2px 0;';
          menu.append(sep);
        }

        const locateBtn = document.createElement('button');
        locateBtn.textContent = 'Locate device';
        locateBtn.addEventListener('click', () => {
          closeMenu();
          focusNode(node.id());
        });
        menu.append(locateBtn);

        if (options?.onCompare) {
          const inCompare = options.onCompareHas?.(node.id()) ?? false;
          const compareBtn = document.createElement('button');
          compareBtn.textContent = inCompare ? 'Remove from comparison' : 'Add to comparison';
          compareBtn.addEventListener('click', () => {
            closeMenu();
            options.onCompare!(node.id(), nodeType);
          });
          menu.append(compareBtn);
        }
      }

      if (!menu.children.length) return;

      menu.addEventListener('mousedown', e => e.stopPropagation());

      container.style.position = 'relative';
      container.append(menu);

      const maxX = container.offsetWidth - menu.offsetWidth - 4;
      const maxY = container.offsetHeight - menu.offsetHeight - 4;
      menu.style.left = `${Math.min(rp.x, maxX)}px`;
      menu.style.top  = `${Math.min(rp.y, maxY)}px`;
    });

    cy.on('tap', () => closeMenu());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('mousedown', e => {
      if (activeMenu && !activeMenu.contains(e.target as Node)) closeMenu();
    });
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
  setupContextMenu();

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
    activeLayout?.stop();
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
      if (level === currentLevel) return;

      // Null the sentinel BEFORE stopping so in-flight layoutstop handlers detect cancellation.
      const prevLayout = activeLayout;
      activeLayout = null;
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

      // if (level === 'none') return;

      layout.register();
      const layoutOpts = { ...layout.expandCollapse(), randomize: false };
      const layoutInstance = cy.layout(layoutOpts);
      activeLayout = layoutInstance;

      layoutInstance.on('layoutstop', () => {
        if (activeLayout === layoutInstance) {
          separateSiblingCompounds(cy);
        }
      });

      layoutInstance.run();
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

      activeLayout?.stop();
      activeLayout = null;
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
