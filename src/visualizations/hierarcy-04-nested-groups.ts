import cytoscape from 'cytoscape';
import image from '../../assets/cisco.png';
import { createBaseStyles, runLayout, setupExpandCollapse } from '../cytoscape-utils.ts';
import { createEdge, createGroupNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: Nested Groups';
export const description = 'Demonstrates nested groups (groups within groups) with edges between leaf nodes in different branches of the hierarchy.';

const switzerland = createGroupNode({ id: 'switzerland', title: 'Switzerland', label: 'Switzerland' });
const bern = createGroupNode({ id: 'bern', title: 'Bern', label: 'Bern', parent: switzerland });
const zurich = createGroupNode({ id: 'zurich', title: 'Zurich', label: 'Zurich', parent: switzerland });

const hq = createGroupNode({ id: 'hq', title: 'HQ', label: 'HQ' , parent: zurich });
const branch01 = createGroupNode({ id: 'branch01', title: 'Branch 01', label: 'Branch 01', parent: zurich });
const branch02 = createGroupNode({ id: 'branch02', title: 'Branch 02', label: 'Branch 02', parent: bern });

const nodes = [switzerland, bern, zurich, hq, branch01, branch02];

const edges = [
  createEdge({ source: hq, target: branch01 }),
  createEdge({ source: hq, target: branch02 }),
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
