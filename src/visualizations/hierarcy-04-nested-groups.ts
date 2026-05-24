import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, createGroupNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Nested Groups';
export const description = 'Demonstrates nested groups (groups within groups) with edges between leaf nodes in different branches of the hierarchy.';

const switzerland = createGroupNode({ id: 'switzerland', title: 'Switzerland', label: 'Switzerland' });
const bern = createGroupNode({ id: 'bern', title: 'Bern', label: 'Bern', parent: switzerland });
const zurich = createGroupNode({ id: 'zurich', title: 'Zurich', label: 'Zurich', parent: switzerland });

const hq = createGroupNode({ id: 'hq', title: 'HQ', label: 'HQ' , parent: zurich });
const branch01 = createGroupNode({ id: 'branch01', title: 'Branch 01', label: 'Branch 01', parent: zurich });
const branch02 = createGroupNode({ id: 'branch02', title: 'Branch 02', label: 'Branch 02', parent: bern });

const r1 = createDeviceNode({ id: 'r1', title: 'R1', label: 'R1', device_type: 'router', parent: hq });
const r2 = createDeviceNode({ id: 'r2', title: 'R2', label: 'R2', device_type: 'router', parent: branch01 });
const r3 = createDeviceNode({ id: 'r3', title: 'R3', label: 'R3', device_type: 'router', parent: branch02 });

const s1 = createDeviceNode({ id: 's1', title: 'S1', label: 'S1', device_type: 'switch', parent: r1 });
const s2 = createDeviceNode({ id: 's2', title: 'S2', label: 'S2', device_type: 'switch', parent: r1 });
const s3 = createDeviceNode({ id: 's3', title: 'S3', label: 'S3', device_type: 'switch', parent: r2 });

const nodes = [switzerland, bern, zurich, hq, branch01, branch02, s1, s2, s3, r1, r2, r3];

const edges = [
  createEdge({ source: r2, target: r1 }),
  createEdge({ source: r3, target: r1 }),
  createEdge({ source: s1, target: r1 }),
  createEdge({ source: s2, target: r1 }),
  createEdge({ source: s1, target: s2 }),
  createEdge({ source: s3, target: r2 }),
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
  setupExpandCollapse(cy, nodes, edges, fcoseProvider, NODE_HIERARCHY);
  runLayout(cy, POSITIONS_KEY, fcoseProvider, 0.2);
}
