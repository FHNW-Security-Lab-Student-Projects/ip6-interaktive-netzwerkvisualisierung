import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { createDeviceNode, createEdge, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Routers with Redundant Edges';
export const description = 'Demonstrates a simple hierarchy with redundant edges between nodes in different branches.';

const r1 = createDeviceNode({ id: 'r1', title: 'Router 1', label: 'R1', device_type: 'router'});
const r2 = createDeviceNode({ id: 'r2', title: 'Router 2', label: 'R2', device_type: 'router'});
const r3 = createDeviceNode({ id: 'r3', title: 'Router 3', label: 'R3', device_type: 'router'});

const nodes = [r1, r2, r3];

// NOTE: All edges are modeled bidirectionally here
const edges = [
  createEdge({ source: r1, target: r2 }),
  createEdge({ source: r2, target: r1 }),

  createEdge({ source: r1, target: r3 }),
  createEdge({ source: r3, target: r1 }),

  createEdge({ source: r2, target: r3 }),
  createEdge({ source: r3, target: r2 }),
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
