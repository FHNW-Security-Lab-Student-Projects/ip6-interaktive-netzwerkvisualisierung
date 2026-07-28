import cytoscape from 'cytoscape';
import type { LayoutProvider } from '../../layout-utils.ts';
import { runLayout } from '../../layout-utils.ts';
import { createNetworkStyles } from '../../network-styles.ts';
import { setupZoom } from '../../zoom-handler.ts';
import {
  createDeviceNode,
  createEdge,
  createGroupNode,
  createHostNode,
  type AnyTypedNode,
  type TypedCytoscapeEdge,
} from '../../node-factory.ts';

// A semi-large, manually defined hierarchical network shared by all layout-provider demos.
// Structure per site: group -> router -> 2 switches -> hosts. Router ring + one cross link
// between sites add redundancy (cycles), so layouts that struggle with cycles/compounds show it.
// Returns fresh instances on every call so multiple Cytoscape instances never share state.
export function buildSemiLargeNetwork(): { nodes: AnyTypedNode[]; edges: TypedCytoscapeEdge[] } {
  const nodes: AnyTypedNode[] = [];
  const edges: TypedCytoscapeEdge[] = [];

  const siteNames = ['Basel', 'Zurich', 'Bern', 'Geneva'];
  const routers: AnyTypedNode[] = [];

  siteNames.forEach((siteName, s) => {
    const g = createGroupNode({ id: `g${s}`, title: `Site ${siteName}`, label: `Site ${siteName}` });
    const router = createDeviceNode({
      id: `r${s}`,
      title: `Router ${siteName}`,
      label: `R-${siteName}`,
      device_type: 'router',
      parent: g,
    });
    nodes.push(g, router);
    routers.push(router);

    // Two access switches per site, each parented to the router.
    for (let sw = 1; sw <= 2; sw++) {
      const swNode = createDeviceNode({
        id: `s${s}-${sw}`,
        title: `Switch ${siteName} ${sw}`,
        label: `SW-${s}${sw}`,
        device_type: 'switch',
        parent: router,
      });
      nodes.push(swNode);
      edges.push(createEdge({ source: router, target: swNode }));

      // Switch 1 gets 3 hosts, switch 2 gets 2 hosts -> ~9 nodes per site.
      const hostCount = sw === 1 ? 3 : 2;
      for (let h = 1; h <= hostCount; h++) {
        const host = createHostNode({
          id: `h${s}-${sw}-${h}`,
          title: `Host ${siteName} ${sw}.${h}`,
          label: `H-${s}${sw}${h}`,
          parent: swNode,
        });
        nodes.push(host);
        edges.push(createEdge({ source: swNode, target: host }));
      }
    }
  });

  // Inter-site WAN: router ring + one cross link for redundancy (creates cycles).
  for (let i = 0; i < routers.length; i++) {
    edges.push(createEdge({ source: routers[i], target: routers[(i + 1) % routers.length] }));
  }
  edges.push(createEdge({ source: routers[0], target: routers[2] }));

  return { nodes, edges };
}

// Renders the shared network with a given layout provider. Full flat view (no expand/collapse)
// so each algorithm's arrangement of the same topology can be compared directly.
export function mountWithLayout(container: HTMLElement, provider: LayoutProvider, positionsKey: string): void {
  const { nodes, edges } = buildSemiLargeNetwork();
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
    elements: [...nodes, ...edges] as cytoscape.ElementDefinition[],
  });
  setupZoom(cy);
  cy.style().update();
  // initialZoom 1 -> runLayout fits + centers uniformly across providers.
  runLayout(cy, positionsKey, provider, 1);
}
