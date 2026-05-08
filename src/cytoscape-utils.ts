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
 * Returns the base Cytoscape stylesheet used by all visualizations.
 * Includes styles for leaf nodes, compound (parent) nodes, collapsed compound nodes, and edges.
 * The `node.collapsed` style is a no-op for visualizations that don't use setupExpandCollapse.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createBaseStyles(image: string): any[] {
  return [
    {
      selector: 'node:childless:not(.collapsed)',
      style: {
        'background-opacity': 0,
        'background-image': image,
        'background-fit': 'cover',
        'text-wrap': 'wrap',
        'label': (ele: cytoscape.NodeSingular) => (ele.data('label') as string) ?? '',
        'font-size': '8px',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'z-index': 1,
      },
    },
    {
      selector: 'node:parent:not(.collapsed)',
      style: {
        'background-opacity': 0.06,
        'background-color': '#4a90d9',
        'border-width': 1,
        'border-color': '#4a90d9',
        'border-opacity': 0.4,
        'padding': '20px',
        'label': (ele: cytoscape.NodeSingular) => (ele.data('label') as string) ?? '',
        'text-valign': 'top',
        'font-size': '10px',
        'z-index': 0,
        'cursor': 'pointer',
      },
    },
    {
      // Collapsed compound node: fixed size so it looks like a leaf node
      selector: 'node.collapsed',
      style: {
        'width': 40,
        'height': 40,
        'background-opacity': 0,
        'background-image': image,
        'background-fit': 'cover',
        'padding': 0,
        'border-width': 2,
        'border-color': '#4a90d9',
        'border-opacity': 0.8,
        'label': (ele: cytoscape.NodeSingular) => (ele.data('label') as string) ?? '',
        'text-valign': 'bottom',
        'font-size': '8px',
        'text-margin-y': 4,
        'cursor': 'pointer',
        'z-index': 2,
      },
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'line-color': '#ccc',
        'width': 1.5,
        'z-index': 1,
      },
    },
    {
      // Redundant/secondary links (e.g. dual-uplink switches).
      // Apply by passing classes: 'uplink' to createEdge().
      // unbundled-bezier with a fixed perpendicular offset ensures the arc follows
      // a clearly different path from straight peering edges, even when the endpoints
      // are visually close (e.g. a switch inside the same compound as a router).
      selector: 'edge.uplink',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 80,
        'control-point-weights': 0.5,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'line-color': '#4a90d9',
        'width': 1.5,
      },
    },
  ];
}

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
  for (const level of hierarchy) {
    const atLevel = rootNodes.filter(n => level.matches(n.data));
    if (atLevel.length > 0) return atLevel;
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
 * The visualization file should NOT call cy.add() — this function owns graph population.
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

  // Start with only the outermost hierarchy level present among root nodes
  const allRootNodes = nodes.filter(n => n.data.parent === undefined);
  const rootNodes = getInitialNodes(allRootNodes, hierarchy);
  cy.add(rootNodes as cytoscape.ElementDefinition[]);
  rootNodes.forEach(n => {
    if (isExpandable(n.data.id)) cy.$id(n.data.id).addClass('collapsed');
  });
  syncEdges();

  // Remembers where each node was when it was last visible, so collapsing and
  // re-expanding restores the same layout rather than recalculating from scratch.
  const savedPositions = new Map<string, cytoscape.Position>();

  // Single handler avoids the double-fire problem: if two selector-based handlers
  // are registered, Cytoscape may re-evaluate the second selector after the first
  // handler has mutated the node (e.g. added children, removed class), causing both
  // expand and collapse to fire on the same tap.
  //
  // No layout is run after expand/collapse: existing nodes stay put (no zoom change),
  // and new nodes appear at their saved position or at a circle spread around the parent.
  cy.on('tap', 'node', event => {
    event.stopPropagation();
    const node = event.target as cytoscape.NodeSingular;

    if (node.hasClass('collapsed')) {
      const children = getDirectChildren(node.id());
      const parentPos = node.position();
      const RADIUS = 80;

      // Calculate raw positions (saved or circle spread)
      const rawPositions = children.map((child, i) => {
        if (savedPositions.has(child.data.id)) {
          return savedPositions.get(child.data.id)!;
        }
        const angle = (2 * Math.PI * i) / children.length;
        return { x: parentPos.x + RADIUS * Math.cos(angle), y: parentPos.y + RADIUS * Math.sin(angle) };
      });

      // The bounding box of the raw positions may not be centered at parentPos
      // (e.g. 3 nodes at 0°/120°/240° produce a bbox shifted 20px right).
      // Compensate so the compound's bbox center stays at parentPos after expansion.
      const xs = rawPositions.map(p => p.x);
      const ys = rawPositions.map(p => p.y);
      const dx = parentPos.x - (Math.min(...xs) + Math.max(...xs)) / 2;
      const dy = parentPos.y - (Math.min(...ys) + Math.max(...ys)) / 2;
      const finalPositions = rawPositions.map(p => ({ x: p.x + dx, y: p.y + dy }));

      // Batch so Cytoscape renders only the final state (no intermediate jump to (0,0)).
      // syncEdges is called after the batch so the compound hierarchy is fully
      // established before edges are added — ancestor() lookups inside a batch
      // can return stale results.
      cy.batch(() => {
        cy.add(children as cytoscape.ElementDefinition[]);
        children.forEach((child, i) => {
          (cy.$id(child.data.id) as cytoscape.NodeSingular).position(finalPositions[i]);
          if (isExpandable(child.data.id)) cy.$id(child.data.id).addClass('collapsed');
        });
        node.removeClass('collapsed');
      });
      syncEdges();

    } else if (node.isParent()) {
      // Save positions before removing so re-expand restores them
      getAllDescendants(node.id()).forEach(desc => {
        const descNode = cy.$id(desc.data.id) as cytoscape.NodeSingular;
        if (descNode.length) savedPositions.set(desc.data.id, descNode.position());
      });
      cy.batch(() => {
        // Remove in reverse order (leaves first) so compound sizing updates cleanly
        getAllDescendants(node.id()).reverse().forEach(desc => {
          cy.$id(desc.data.id).remove();
        });
        node.addClass('collapsed');
      });
      syncEdges();
    }
  });
}
