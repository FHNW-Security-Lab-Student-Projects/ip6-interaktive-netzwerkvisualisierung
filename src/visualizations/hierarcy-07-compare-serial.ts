import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, createGroupNode, createHostNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Comparison of Serial vs Nested Grouping';
export const description = 'This visualization demonstrates the difference between approaches to displaying / grouping nodes in a hierarchical graph: serial, grouping and nested grouping. Both graphs contain the same set of nodes and edges, but the way they are grouped differs.';

const group = createGroupNode({ id: 'group', title: 'Group', label: 'Group' });
const r1 = createDeviceNode({ id: 'r1', title: 'Router 1', label: 'R1', device_type: 'router' });
const s1 = createDeviceNode({ id: 's1', title: 'Switch 1', label: 'S1', device_type: 'switch' });
const u1 = createDeviceNode({ id: 'u1', title: 'Unclassified Device 1', label: 'U1', device_type: 'unknown' });
const h1 = createHostNode({ id: 'h1', title: 'Host 1', label: 'H1'});

const groupNested = createGroupNode({ id: 'groupNested', title: 'Nested Group', label: 'Nested Group'});
const r2 = createDeviceNode({ id: 'r2', title: 'Router 2', label: 'R2', device_type: 'router', parent: groupNested });
const s2 = createDeviceNode({ id: 's2', title: 'Switch 2', label: 'S2', device_type: 'switch', parent: groupNested });
const u2 = createDeviceNode({ id: 'u2', title: 'Unclassified Device 2', label: 'U2', device_type: 'unknown', parent: groupNested });
const h2 = createHostNode({ id: 'h2', title: 'Host 2', label: 'H2', parent: groupNested });

const groupCompound = createGroupNode({ id: 'groupCompound', title: 'Compound Group', label: 'Compound Group' });
const r3 = createDeviceNode({ id: 'r3', title: 'Router 3', label: 'R3', device_type: 'router', parent: groupCompound });
const s3 = createDeviceNode({ id: 's3', title: 'Switch 3', label: 'S3', device_type: 'switch', parent: r3 });
const u3 = createDeviceNode({ id: 'u3', title: 'Unclassified Device 3', label: 'U3', device_type: 'unknown', parent: s3 });
const h3 = createHostNode({ id: 'h3', title: 'Host 3', label: 'H3', parent: s3 });

const r4 = createDeviceNode({ id: 'r4', title: 'Router 4', label: 'R4', device_type: 'router', parent: groupCompound });
const s4 = createDeviceNode({ id: 's4', title: 'Switch 4', label: 'S4', device_type: 'switch', parent: r4 });


const nodes = [group, groupNested, r1, s1, u1, h1, r2, s2, u2, h2, groupCompound, r3, s3, u3, h3, r4, s4];

const edges = [
  createEdge({ source: r1, target: group }),
  createEdge({ source: s1, target: r1 }),
  createEdge({ source: u1, target: s1 }),
  createEdge({ source: h1, target: s1 }),

  createEdge({ source: r2, target: groupNested }),
  createEdge({ source: s2, target: r2 }),
  createEdge({ source: u2, target: s2 }),
  createEdge({ source: h2, target: s2 }),

  createEdge({ source: r3, target: groupCompound }),
  createEdge({ source: s3, target: r3 }),
  createEdge({ source: u3, target: s3 }),
  createEdge({ source: h3, target: s3 }),

  createEdge({ source: s4, target: r4 }),
  
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
