import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseLargeProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import type { AnyTypedNode, TypedCytoscapeEdge } from '../node-factory.ts';
import { NODE_HIERARCHY } from '../node-factory.ts';
import basegraph from '../fixtures/basegraph.json';

export const title = 'API Network: Original Graph';
export const description =
  'Real network data from a saved API fixture. Renders the graph using our style and the fcose layout. The graph is rendered in its original form, without any preprocessing or filtering.';

const raw = {
  nodes: basegraph.nodes as unknown as AnyTypedNode[],
  edges: basegraph.edges as unknown as TypedCytoscapeEdge[],
};

const POSITIONS_KEY = `netviz-positions-${title}`;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    wheelSensitivity: 0.1,
    style: createNetworkStyles(),
  });

  cy.style().update();
  setupExpandCollapse(cy, raw.nodes, raw.edges, fcoseLargeProvider, NODE_HIERARCHY, "all");
  runLayout(cy, POSITIONS_KEY, fcoseLargeProvider, 0.2);
}
