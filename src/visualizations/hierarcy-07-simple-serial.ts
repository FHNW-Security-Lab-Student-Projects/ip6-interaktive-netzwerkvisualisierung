import cytoscape from 'cytoscape';
import { runLayout, setupExpandCollapse } from '../cytoscape-utils.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, createGroupNode, createHostNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Components';
export const description = 'Illustrates different hierarchical components (routers, switches, hosts) with edges between them.';

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

const nodes = [group, groupNested, r1, s1, u1, h1, r2, s2, u2, h2, groupCompound, r3, s3, u3, h3];

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
