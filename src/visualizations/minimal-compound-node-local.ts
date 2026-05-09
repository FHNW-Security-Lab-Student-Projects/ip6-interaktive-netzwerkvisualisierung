import cytoscape from 'cytoscape';
import { runLayout } from '../cytoscape-utils.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, createGroupNode } from '../node-factory.ts';

export const title = 'Minimal Example Local: HQ with 3 routers';
export const description = 'Basic network graph using local mock data. Showing a compound node (HQ) containing 3 child nodes (routers), all connected to each other.<br>Uses fcose autolayout with positions saved to localStorage to persist layout across page reloads.';

const hq = createGroupNode({ id: 'hq', title: 'HQ', label: 'HQ' });

const r1 = createDeviceNode({ id: 'r1', title: 'Router 1', label: 'R1', device_type: 'router', parent: hq });
const r2 = createDeviceNode({ id: 'r2', title: 'Router 2', label: 'R2', device_type: 'router', parent: hq });
const r3 = createDeviceNode({ id: 'r3', title: 'Router 3', label: 'R3', device_type: 'router', parent: hq });

const nodes = [hq, r1, r2, r3];

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
    style: createNetworkStyles(),
  });

  cy.add(nodes as cytoscape.ElementDefinition[]);
  cy.add(edges as cytoscape.ElementDefinition[]);
  cy.style().update();
  runLayout(cy, POSITIONS_KEY, 1);
}
