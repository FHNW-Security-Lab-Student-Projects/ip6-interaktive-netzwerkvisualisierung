import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { createEdge, createGroupNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Groups';
export const description = 'Demonstrates multiple groups with edges between them.';

const hq = createGroupNode({ id: 'hq', title: 'HQ', label: 'HQ' });
const branch01 = createGroupNode({ id: 'branch01', title: 'Branch 01', label: 'Branch 01' });
const branch02 = createGroupNode({ id: 'branch02', title: 'Branch 02', label: 'Branch 02' });

const nodes = [hq, branch01, branch02];

const edges = [
  createEdge({ source: hq, target: branch01 }),
  createEdge({ source: hq, target: branch02 }),
];

const POSITIONS_KEY = `netviz-positions-${title}`;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
  });
  setupZoom(cy);

  cy.style().update();
  setupExpandCollapse(cy, nodes, edges, fcoseProvider, NODE_HIERARCHY);
  runLayout(cy, POSITIONS_KEY, fcoseProvider, 0.2);
}
