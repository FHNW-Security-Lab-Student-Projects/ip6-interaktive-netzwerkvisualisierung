import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, createGroupNode, createHostNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Nested Compound Nodes: HQ network hierarchy';
export const description = 'Demonstrates progressive disclosure of a nested network hierarchy. Click an expanded group to collapse it.';

const hq = createGroupNode({ id: 'hq', title: 'HQ', label: 'HQ' });

const r1 = createDeviceNode({ id: 'r1', title: 'Router 1', label: 'R1', device_type: 'router', parent: hq });
const r2 = createDeviceNode({ id: 'r2', title: 'Router 2', label: 'R2', device_type: 'router', parent: hq });
const r3 = createDeviceNode({ id: 'r3', title: 'Router 3', label: 'R3', device_type: 'router', parent: hq });

const s1 = createDeviceNode({ id: 's1', title: 'Switch 1', label: 'S1', device_type: 'switch', parent: r1 });
const s2 = createDeviceNode({ id: 's2', title: 'Switch 2', label: 'S2', device_type: 'switch', parent: r2 });

const h1 = createHostNode({ id: 'h1', title: 'Host 1', label: 'H1', parent: s1 });
const h2 = createHostNode({ id: 'h2', title: 'Host 2', label: 'H2', parent: s2 });
const h3 = createHostNode({ id: 'h3', title: 'Host 3', label: 'H3', parent: s2 });

const nodes = [hq, r1, r2, r3, s1, s2, h1, h2, h3];

const edges = [
  createEdge({ source: r1, target: r2 }),
  createEdge({ source: r1, target: r3 }),
  createEdge({ source: r2, target: r3 }),
  createEdge({ source: r1, target: s1 }),
  createEdge({ source: r2, target: s2 }),
  createEdge({ source: s1, target: h1 }),
  createEdge({ source: s2, target: h2 }),
  createEdge({ source: s2, target: h3 }),
];

const POSITIONS_KEY = `netviz-positions-${title}`;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    wheelSensitivity: 0.1,
    textureOnViewport: true,
    style: createNetworkStyles(),
  });

  cy.style().update();
  setupExpandCollapse(cy, nodes, edges, fcoseProvider, NODE_HIERARCHY);
  runLayout(cy, POSITIONS_KEY, fcoseProvider, 0.2);
}
