import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseLargeProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import type { AnyTypedNode } from '../node-factory.ts';
import { NODE_HIERARCHY } from '../node-factory.ts';
import { loadBasegraph, loadDeviceInfo } from '../graph-loader.ts';
import { groupByUpstreamNode } from '../graph-transforms.ts';
import { setupDetailPanel, setupToolbar, setupSearch, setupZoomFitButton, setupLegend, setupComparePanel, setupCompareButton, setupStpEnrichment, setupVlanOverlay } from '../components/index.ts';

export const title = 'API Network: Compound Graph - Switches Expanded';
export const description =
  'Real network data loaded live from the API. Renders the graph using our style and the fcose layout. The graph is preprocessed to group hosts under their direct upstream device, and to group unknown relay devices under their known parent device. This results in a more hierarchical, compound graph structure that reduces visual clutter and emphasizes the relationships between hosts and devices, as well as the network hierarchy they form.';

const POSITIONS_KEY = `netviz-positions-${title}`;
const NETWORK_ID = 2;
const SNAPSHOT_ID = 1;

export async function mount(container: HTMLElement): Promise<void> {
  const [raw, deviceInfo] = await Promise.all([
    loadBasegraph({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID }),
    loadDeviceInfo({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID }),
  ]);

  // Two-pass grouping to handle intermediate unknown devices (e.g. MOXA converters):
  //
  // Pass 1: nest unknown relay devices under their known parent.
  //         e.g. ZFG-02-MOXA -> ZFG-02, CAM-01-HUAWEI -> CAM-01
  // Pass 2: nest every host/unknown-device under its direct device neighbor.
  //         minGroupSize=1 ensures lone leaves go directly into their upstream
  //         (not bypassed to a grandparent), so only nodes with a direct edge to
  //         a compound appear as top-level children of that compound.
  //         e.g. hosts -> ZFG-02-MOXA (inside ZFG-02), 10.100.0.32 -> WSJ-02-SIEMENS
  //
  // Result: Site -> known switch -> unknown relay -> hosts
  const isHost = (n: AnyTypedNode) => n.data.node_type === 'host';
  const isUnknownDevice = (n: AnyTypedNode) =>
    n.data.node_type === 'device' && !(n.data as Record<string, unknown>)['known'];
  const isKnownDevice = (n: AnyTypedNode) =>
    n.data.node_type === 'device' && !!(n.data as Record<string, unknown>)['known'];

  const pass1 = groupByUpstreamNode(raw.nodes, raw.edges, {
    isLeaf: isUnknownDevice,
    isUpstream: isKnownDevice,
    minGroupSize: 1,
  });
  const { nodes, edges } = groupByUpstreamNode(pass1.nodes, pass1.edges, {
    isLeaf: n => isHost(n) || isUnknownDevice(n),
    isUpstream: n => n.data.node_type === 'device',
    minGroupSize: 1,
  });

  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
  });
  setupZoom(cy);
  cy.style().update();
  const compare = setupComparePanel({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const deviceNodeIds = raw.nodes
    .filter(n => n.data.node_type === 'device')
    .map(n => n.data.id as string);
  const stpCtrl = setupStpEnrichment(cy, deviceNodeIds, { networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const panelOpts = setupDetailPanel(cy, {
    networkId: NETWORK_ID,
    snapshotId: SNAPSHOT_ID,
    getStpInstanceKey: stpCtrl.getSelectedKey,
    resolveBridgeMac: stpCtrl.resolveBridgeMac,
  });
  const ctrl = setupExpandCollapse(cy, nodes, edges, fcoseLargeProvider, NODE_HIERARCHY, 'switch', { ...panelOpts, onCompare: compare.add, onCompareHas: compare.has });
  compare.setLocate(id => ctrl.focusNode(id));
  panelOpts.setFocusNode(id => ctrl.focusNode(id));
  panelOpts.setChildCountResolver(id => ctrl.getDirectChildCount(id));
  panelOpts.setChildrenResolver(id => ctrl.getDirectChildren(id));
  setupToolbar(ctrl, NODE_HIERARCHY, 'switch');
  setupSearch(ctrl, nodes, deviceInfo);
  setupZoomFitButton(cy);
  setupCompareButton(compare.open);
  setupLegend();
  stpCtrl.start(panelOpts);
  setupVlanOverlay(cy, deviceNodeIds, { networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  runLayout(cy, POSITIONS_KEY, fcoseLargeProvider, 0.2);
}
