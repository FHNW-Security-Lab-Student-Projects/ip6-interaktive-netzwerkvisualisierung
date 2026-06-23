import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseLargeProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import type { AnyTypedNode, TypedCytoscapeEdge } from '../node-factory.ts';
import { NODE_HIERARCHY } from '../node-factory.ts';
import basegraph from '../fixtures/basegraph.json';
import { setupDetailPanel, setupToolbar, setupSearch } from '../components/index.ts';


export const title = 'API Network: Original Graph';
export const description =
  'Real network data from a saved API fixture. Renders the graph using our style and the fcose layout. The graph is rendered in its original form, without any preprocessing or filtering.';

const raw = {
  nodes: basegraph.nodes as unknown as AnyTypedNode[],
  edges: basegraph.edges as unknown as TypedCytoscapeEdge[],
};

const POSITIONS_KEY = `netviz-positions-${title}`;
const NETWORK_ID = 1;
const SNAPSHOT_ID = 1;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
  });
  setupZoom(cy);

  cy.style().update();
  const panelOpts = setupDetailPanel(cy, { networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const ctrl = setupExpandCollapse(cy, raw.nodes, raw.edges, fcoseLargeProvider, NODE_HIERARCHY, 'all', panelOpts);
  panelOpts.setFocusNode(id => ctrl.focusNode(id));
  setupToolbar(ctrl, NODE_HIERARCHY, 'none');
  setupSearch(ctrl, raw.nodes);
  runLayout(cy, POSITIONS_KEY, fcoseLargeProvider, 0.2);
}
