import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { AnyTypedNode, TypedCytoscapeEdge, HierarchyLevel } from './node-factory.ts';

/** NOTE: 
 * We use fcose for all layouts since it supports compound nodes and produces good results with minimal configuration.
 * It is also more performant than cose-bilkent, which is important since we run it on every expand/collapse.
 * https://github.com/iVis-at-Bilkent/cytoscape.js-fcose
 */

// Register fcose layout once and run on import
cytoscape.use(fcose);

/**
 * Runs the initial fcose layout and persists node positions to localStorage.
 * On subsequent loads, restores positions via the preset layout.
 * If the graph has changed (new nodes present), clears the stale cache and re-runs fcose.
 *
 * Only operates on visible nodes so hidden nodes (e.g. collapsed children) don't
 * pollute the position cache.
 */
export function runLayout(cy: cytoscape.Core, positionsKey: string, initialZoom?: number): void {
  function applyZoom(): void {
    if (initialZoom === undefined) return;
    cy.fit();
    cy.zoom(cy.zoom() * initialZoom);
    cy.center();
  }

  const saved = localStorage.getItem(positionsKey);

  if (saved) {
    const positions = JSON.parse(saved) as Record<string, cytoscape.Position>;
    const allPresent = cy.nodes(':visible').every(
      n => positions[(n as cytoscape.NodeSingular).id()] !== undefined,
    );

    if (allPresent) {
      cy.layout({ name: 'preset', positions }).run();
      applyZoom();
      return;
    }
    // Graph has changed (new nodes), clear stale state and re-layout
    localStorage.removeItem(positionsKey);
  }

  const layout = cy.layout({
    name: 'fcose',
    animate: false,
    quality: 'proof',
    idealEdgeLength: 120,
    nodeSeparation: 75,
  } as cytoscape.LayoutOptions);

  layout.on('layoutstop', () => {
    const positions: Record<string, cytoscape.Position> = {};
    cy.nodes(':visible').forEach(n => {
      positions[(n as cytoscape.NodeSingular).id()] = (n as cytoscape.NodeSingular).position();
    });
    localStorage.setItem(positionsKey, JSON.stringify(positions));
    applyZoom();
  });

  layout.run();
}

/**
 * Runs an animated fcose layout after an expand/collapse event.
 * Does not persist positions — the initial layout positions are what we save.
 */
export function runExpandCollapseLayout(cy: cytoscape.Core): void {
  cy.layout({
    name: 'fcose',
    animate: true,
    animationDuration: 400,
    quality: 'proof',
    idealEdgeLength: 120,
    nodeSeparation: 75,
  } as cytoscape.LayoutOptions).run();
}

function getInitialNodes(rootNodes: AnyTypedNode[], hierarchy?: HierarchyLevel[]): AnyTypedNode[] {
  if (!hierarchy || hierarchy.length === 0) return rootNodes;
  for (let i = 0; i < hierarchy.length; i++) {
    const atLevel = rootNodes.filter(n => hierarchy[i].matches(n.data));
    if (atLevel.length > 0) {
      // Also include root nodes that don't match this level or any higher level —
      // they're standalone nodes with no parent to collapse under (e.g. switches
      // in a graph that also has root-level routers).
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

/**
 * Wires up interactive expand/collapse for compound nodes.
 * Manages graph population: adds only root nodes initially, then adds/removes
 * children on expand/collapse rather than toggling display.
 *
 * - Tap a collapsed node  -> add its direct children to the graph, animate layout
 * - Tap an expanded compound -> remove all descendants (and edges), animate layout
 *
 * The visualization file should NOT call cy.add(), this function owns graph population.
 *
 * @param cy    The Cytoscape instance (elements not yet added).
 * @param nodes Full node list, source of truth for hierarchy.
 * @param edges Full edge list, edges whose endpoints are both present get added automatically.
 */
export function setupExpandCollapse(
  cy: cytoscape.Core,
  nodes: AnyTypedNode[],
  edges: TypedCytoscapeEdge[],
  hierarchy?: HierarchyLevel[],
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

  // Returns the deepest ancestor of nodeId that is currently in the graph,
  // or the node itself if it is present. Returns null if no ancestor is visible.
  // Used to "lift" edges whose endpoints are hidden inside collapsed compounds.
  function getRepresentative(nodeId: string): string | null {
    if (cy.$id(nodeId).length > 0) return nodeId;
    const nodeData = nodes.find(n => n.data.id === nodeId)?.data;
    if (!nodeData?.parent) return null;
    return getRepresentative(nodeData.parent);
  }

  // Rebuilds all edges from scratch.
  // - Edges whose both original endpoints are in the graph are added as-is,
  //   except parent->child edges which are implicit from compound containment.
  // - Edges whose endpoint is inside a collapsed compound are "lifted" to the
  //   nearest visible ancestor, so inter-group connectivity is always visible.
  // - Multiple original edges that lift to the same pair are deduplicated.
  // Must be called outside cy.batch() so ancestor() lookups reflect committed state.
  function syncEdges(): void {
    cy.edges().remove();
    const addedPairs = new Set<string>();
    edges.forEach(edge => {
      const repSrc = getRepresentative(edge.data.source);
      const repTgt = getRepresentative(edge.data.target);
      if (!repSrc || !repTgt || repSrc === repTgt) return;
      // Both original endpoints are directly in the graph, skip parent<->child edges
      // (containment already implies the relationship visually).
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


  // Remembers where each node was when it was last visible, so collapsing and
  // re-expanding restores the same layout rather than recalculating from scratch.
  const savedPositions = new Map<string, cytoscape.Position>();

  // Remembers which expandable nodes were in an expanded state when their ancestor
  // was collapsed. On re-expand, these nodes are automatically re-expanded so the
  // user sees the same depth they had before without extra clicks.
  const savedExpanded = new Set<string>();


  // Expands a single collapsed node, then recursively re-expands any children that
  // were expanded before the subtree was last collapsed.
  function doExpand(node: cytoscape.NodeSingular): void {
    const children = getDirectChildren(node.id());
    const parentPos = node.position();
    const RADIUS = 80;

    const rawPositions = children.map((child, i) => {
      if (savedPositions.has(child.data.id)) {
        return savedPositions.get(child.data.id)!;
      }
      const angle = (2 * Math.PI * i) / children.length;
      return { x: parentPos.x + RADIUS * Math.cos(angle), y: parentPos.y + RADIUS * Math.sin(angle) };
    });

    const xs = rawPositions.map(p => p.x);
    const ys = rawPositions.map(p => p.y);
    const dx = parentPos.x - (Math.min(...xs) + Math.max(...xs)) / 2;
    const dy = parentPos.y - (Math.min(...ys) + Math.max(...ys)) / 2;
    const finalPositions = rawPositions.map(p => ({ x: p.x + dx, y: p.y + dy }));

    // Batch so Cytoscape renders only the final state (no intermediate jump to (0,0)).
    // syncEdges is called after the batch so ancestor() lookups reflect committed state.
    cy.batch(() => {
      cy.add(children as cytoscape.ElementDefinition[]);
      children.forEach((child, i) => {
        (cy.$id(child.data.id) as cytoscape.NodeSingular).position(finalPositions[i]);
        if (isExpandable(child.data.id)) cy.$id(child.data.id).addClass('collapsed');
      });
      node.removeClass('collapsed');
    });
    syncEdges();

    // Re-expand children that were expanded before this subtree was collapsed.
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


  // Start with only the outermost hierarchy level present among root nodes
  const allRootNodes = nodes.filter(n => n.data.parent === undefined);
  const rootNodes = getInitialNodes(allRootNodes, hierarchy);
  cy.add(rootNodes as cytoscape.ElementDefinition[]);
  rootNodes.forEach(n => {
    if (isExpandable(n.data.id)) cy.$id(n.data.id).addClass('collapsed');
  });
  syncEdges();


  // Left-click on a collapsed node -> expand.
  // Left-click on the label badge of an expanded compound -> collapse.
  // The label sits at text-valign:'top', so we check whether the click's rendered Y
  // is within LABEL_HIT_PX of the node's top bounding-box edge.
  const LABEL_HIT_PX = 28;

  cy.on('tap', 'node', event => {
    event.stopPropagation();
    const node = event.target as cytoscape.NodeSingular;

    if (node.hasClass('collapsed')) {
      doExpand(node);
      return;
    }

    if (node.isParent()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clickY: number = (event as any).renderedPosition?.y ?? (event as any).cyRenderedPosition?.y;
      const bb = node.renderedBoundingBox({ includeLabels: false, includeOverlays: false });
      if (clickY <= bb.y1 + LABEL_HIT_PX) doCollapse(node);
    }
  });
}
