import cytoscape from 'cytoscape';
import image from '../../assets/cisco.png';
import { createBaseStyles, runLayout, setupExpandCollapse } from '../cytoscape-utils.ts';
import { createDeviceNode, createEdge, createGroupNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Groups of Routers';
export const description = 'Demonstrates multiple groups with routers inside, with edges between the routers.';

const hq = createGroupNode({ id: 'hq', title: 'HQ', label: 'HQ' });
const branch01 = createGroupNode({ id: 'branch01', title: 'Branch 01', label: 'Branch 01' });

const r1 = createDeviceNode({ id: 'r1', title: 'Router 1', label: 'R1', device_type: 'router', parent: hq });
const r2 = createDeviceNode({ id: 'r2', title: 'Router 2', label: 'R2', device_type: 'router', parent: hq });
const r3 = createDeviceNode({ id: 'r3', title: 'Router 3', label: 'R3', device_type: 'router', parent: branch01 });

const nodes = [hq, branch01, r1, r2, r3];

const edges = [
  createEdge({ source: r1, target: r2 }),
  createEdge({ source: r1, target: r3 }),
  createEdge({ source: r2, target: r3 }),
];

const POSITIONS_KEY = `netviz-positions-${title}`;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    wheelSensitivity: 0.1,
    style: createBaseStyles(image),
  });

  cy.style().update();
  setupExpandCollapse(cy, nodes, edges, NODE_HIERARCHY);
  runLayout(cy, POSITIONS_KEY, 0.2);
}
