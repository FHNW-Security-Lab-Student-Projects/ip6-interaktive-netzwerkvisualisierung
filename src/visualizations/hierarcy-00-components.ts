import cytoscape from 'cytoscape';
import { runLayout, setupExpandCollapse } from '../cytoscape-utils.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, createHostNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Components';
export const description = 'Illustrates different hierarchical components (routers, switches, hosts) with edges between them.';

const r1 = createDeviceNode({ id: 'r1', title: 'Router 1', label: 'R1', device_type: 'router'});
const r2 = createDeviceNode({ id: 'r2', title: 'Router 2', label: 'R2', device_type: 'router'});
// const r3 = createDeviceNode({ id: 'r3', title: 'Router 3', label: 'R3', device_type: 'router'});

const s1r1 = createDeviceNode({ id: 's1r1', title: 'Switch 1 (R1)', label: 'S1R1', device_type: 'switch', parent: r1 });
const s2r1 = createDeviceNode({ id: 's2r1', title: 'Switch 2 (R1)', label: 'S2R1', device_type: 'switch', parent: r1 });

const s1r2 = createDeviceNode({ id: 's1r2', title: 'Switch 1 (R2)', label: 'S1R2', device_type: 'switch', parent: r2 });
const s2r2 = createDeviceNode({ id: 's2r2', title: 'Switch 2 (R2)', label: 'S2R2', device_type: 'switch', parent: r2 });

const s1r3 = createDeviceNode({ id: 's1r3', title: 'Switch 1 (R3)', label: 'S1R3', device_type: 'switch'});
const s2r3 = createDeviceNode({ id: 's2r3', title: 'Switch 2 (R3)', label: 'S2R3', device_type: 'switch'});

const h1s1r1 = createHostNode({ id: 'h1s1r1', title: 'Host 1 (S1R1)', label: 'H1S1R1', parent: s1r1 });
const h2s1r1 = createHostNode({ id: 'h2s1r1', title: 'Host 2 (S1R1)', label: 'H2S1R1', parent: s1r1 });

const h1s2r1 = createHostNode({ id: 'h1s2r1', title: 'Host 1 (S2R1)', label: 'H1S2R1', parent: s2r1 });
const h2s2r1 = createHostNode({ id: 'h2s2r1', title: 'Host 2 (S2R1)', label: 'H2S2R1', parent: s2r1 });

const h1s1r2 = createHostNode({ id: 'h1s1r2', title: 'Host 1 (S1R2)', label: 'H1S1R2', parent: s1r2 });
const h2s1r2 = createHostNode({ id: 'h2s1r2', title: 'Host 2 (S1R2)', label: 'H2S1R2', parent: s1r2 });

const h1s2r2 = createHostNode({ id: 'h1s2r2', title: 'Host 1 (S2R2)', label: 'H1S2R2', parent: s2r2 });
const h2s2r2 = createHostNode({ id: 'h2s2r2', title: 'Host 2 (S2R2)', label: 'H2S2R2', parent: s2r2 });

const h1s1r3 = createHostNode({ id: 'h1s1r3', title: 'Host 1 (S1R3)', label: 'H1S1R3', parent: s1r3 });
const h2s1r3 = createHostNode({ id: 'h2s1r3', title: 'Host 2 (S1R3)', label: 'H2S1R3', parent: s1r3 });

const h1s2r3 = createHostNode({ id: 'h1s2r3', title: 'Host 1 (S2R3)', label: 'H1S2R3', parent: s2r3 });
const h2s2r3 = createHostNode({ id: 'h2s2r3', title: 'Host 2 (S2R3)', label: 'H2S2R3', parent: s2r3 });

const nodes = [r1, r2, s1r1, s2r1, s1r2, s2r2, s1r3, s2r3, h1s1r1, h2s1r1, h1s2r1, h2s2r1, h1s1r2, h2s1r2, h1s2r2, h2s2r2, h1s1r3, h2s1r3, h1s2r3, h2s2r3];

const edges = [
  createEdge({ source: r1, target: r2 }),
  // createEdge({ source: r1, target: r3 }),
  // createEdge({ source: r2, target: r3 }),

  createEdge({ source: s1r1, target: r1 }),
  createEdge({ source: s2r1, target: r1 }),
  createEdge({ source: s1r2, target: r2 }),
  createEdge({ source: s2r2, target: r2 }),
  createEdge({ source: s1r3, target: s2r3 }),
  // createEdge({ source: s2r3, target: r3 }),

  createEdge({ source: h1s1r1, target: s1r1 }),
  createEdge({ source: h2s1r1, target: s1r1 }),
  createEdge({ source: h1s2r1, target: s2r1 }),
  createEdge({ source: h2s2r1, target: s2r1 }),
  createEdge({ source: h1s1r2, target: s1r2 }),
  createEdge({ source: h2s1r2, target: s1r2 }),
  createEdge({ source: h1s2r2, target: s2r2 }),
  createEdge({ source: h2s2r2, target: s2r2 }),
  createEdge({ source: h1s1r3, target: s1r3 }),
  createEdge({ source: h2s1r3, target: s1r3 }),
  createEdge({ source: h1s2r3, target: s2r3 }),
  createEdge({ source: h2s2r3, target: s2r3 }),

  createEdge({ source: s1r3, target: s2r2 }),
];

const POSITIONS_KEY = `netviz-positions-${title}`;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    wheelSensitivity: 0.1,
    style: createNetworkStyles(),
  });

  cy.style().update();
  setupExpandCollapse(cy, nodes, edges, NODE_HIERARCHY);
  runLayout(cy, POSITIONS_KEY, 0.2);
}
