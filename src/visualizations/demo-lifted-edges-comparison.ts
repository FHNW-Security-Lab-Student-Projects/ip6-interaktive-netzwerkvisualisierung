import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { createDeviceNode, createEdge, createGroupNode, createHostNode, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Lifted Edges vs. Normal';
export const description =
  'Side-by-side comparison of the same network, both starting collapsed. Left: how Cytoscape renders ' +
  'without our lifted-edges logic — edges attached to hidden children simply drop, so the collapsed ' +
  'sites look disconnected. Right: with lifted edges the connections are re-attached to the groups and ' +
  'summarized into a single edge.';

function buildGraph() {
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
  return { nodes, edges };
}

function buildPanel(parent: HTMLElement, label: string, liftEdges: boolean, positionsKey: string): void {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;flex:1;min-width:0;height:100%;border-left:1px solid #e2e8f0;';

  const heading = document.createElement('div');
  heading.textContent = label;
  heading.style.cssText =
    'position:absolute;top:8px;left:8px;z-index:10;padding:4px 8px;border-radius:4px;' +
    'background:rgba(255,255,255,0.9);font:600 13px sans-serif;color:#1e293b;pointer-events:none;';

  const graph = document.createElement('div');
  graph.style.cssText = 'position:absolute;inset:0;';

  wrapper.appendChild(graph);
  wrapper.appendChild(heading);
  parent.appendChild(wrapper);

  const { nodes, edges } = buildGraph();
  const cy = cytoscape({
    container: graph,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
  });
  setupZoom(cy);
  cy.style().update();

  // Strip lifted edges before setup so the initial collapsed sync is already "normal".
  if (!liftEdges) {
    cy.on('add', 'edge', event => {
      const edge = event.target as cytoscape.EdgeSingular;
      if (edge.id().startsWith('__lifted__')) edge.remove();
    });
  }

  // Both sites start collapsed, so the difference is visible immediately.
  setupExpandCollapse(cy, nodes, edges, fcoseProvider, NODE_HIERARCHY, 'none');
  runLayout(cy, positionsKey, fcoseProvider, 0.2);
}

export function mount(container: HTMLElement): void {
  container.style.display = 'flex';
  container.style.height = '100%';

  buildPanel(container, 'Normal (Cytoscape without lifted edges)', false, `netviz-positions-${title}-normal`);
  buildPanel(container, 'With lifted edges', true, `netviz-positions-${title}-lifted`);
}
