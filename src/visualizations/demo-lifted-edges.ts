import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { createDeviceNode, createEdge, createGroupNode, createHostNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Lifted Edges';
export const description =
  'Shows how several connections between nested nodes in different groups are summarized into a single ' +
  'edge when the groups are collapsed. Both sites start collapsed: the three A↔B connections appear as ' +
  'one lifted edge.';

const gA = createGroupNode({ id: 'gA', title: 'Site A', label: 'Site A' });
const rA = createDeviceNode({ id: 'rA', title: 'Router A', label: 'R-A', device_type: 'router', parent: gA });
const sA1 = createDeviceNode({ id: 'sA1', title: 'Switch A1', label: 'SW-A1', device_type: 'switch', parent: rA });
const sA2 = createDeviceNode({ id: 'sA2', title: 'Switch A2', label: 'SW-A2', device_type: 'switch', parent: rA });
const hA1 = createHostNode({ id: 'hA1', title: 'Host A1', label: 'H-A1', parent: sA1 });
const hA2 = createHostNode({ id: 'hA2', title: 'Host A2', label: 'H-A2', parent: sA2 });

const gB = createGroupNode({ id: 'gB', title: 'Site B', label: 'Site B' });
const rB = createDeviceNode({ id: 'rB', title: 'Router B', label: 'R-B', device_type: 'router', parent: gB });
const sB1 = createDeviceNode({ id: 'sB1', title: 'Switch B1', label: 'SW-B1', device_type: 'switch', parent: rB });
const sB2 = createDeviceNode({ id: 'sB2', title: 'Switch B2', label: 'SW-B2', device_type: 'switch', parent: rB });
const hB1 = createHostNode({ id: 'hB1', title: 'Host B1', label: 'H-B1', parent: sB1 });
const hB2 = createHostNode({ id: 'hB2', title: 'Host B2', label: 'H-B2', parent: sB2 });

const nodes = [gA, rA, sA1, sA2, hA1, hA2, gB, rB, sB1, sB2, hB1, hB2];

const edges = [
  createEdge({ source: rA, target: rB }),
  createEdge({ source: sA1, target: sB1 }),
  createEdge({ source: sA2, target: sB2 }),
  createEdge({ source: sA1, target: sA2 }),
  createEdge({ source: sB1, target: sB2 }),
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
  setupExpandCollapse(cy, nodes, edges, fcoseProvider, NODE_HIERARCHY, 'none');
  runLayout(cy, POSITIONS_KEY, fcoseProvider, 0.2);
}
