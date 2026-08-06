import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseLargeProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import type { AnyTypedNode } from '../node-factory.ts';
import { NODE_HIERARCHY } from '../node-factory.ts';
import { loadBasegraph } from '../graph-loader.ts';
import { groupByUpstreamNode } from '../graph-transforms.ts';
import { setupDetailPanel, setupToolbar, setupSearch, setupZoomFitButton, setupLegend, setupStpEnrichment, setupComparePanel, setupCompareButton, setupVlanToggle } from '../components/index.ts';
import { getDevice } from '../generated/sdk.gen.ts';

export const title = 'API Network: Compound Graph';
export const description =
  'Real network data loaded live from the API. Renders the graph using our style and the fcose layout. The graph is preprocessed to group hosts under their direct upstream device, and to group unknown relay devices under their known parent device. This results in a more hierarchical, compound graph structure that reduces visual clutter and emphasizes the relationships between hosts and devices, as well as the network hierarchy they form.';

const POSITIONS_KEY = `netviz-positions-${title}`;
const NETWORK_ID = 2;
const SNAPSHOT_ID = 1;

export async function mount(container: HTMLElement): Promise<void> {
  const raw = await loadBasegraph({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });

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

  const deviceNodeIds = raw.nodes
    .filter(n => n.data.node_type === 'device')
    .map(n => n.data.id as string);

  const compare = setupComparePanel({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const stpCtrl = setupStpEnrichment(cy, deviceNodeIds, { networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const panelOpts = setupDetailPanel(cy, {
    networkId: NETWORK_ID,
    snapshotId: SNAPSHOT_ID,
    getStpInstanceKey: stpCtrl.getSelectedKey,
    resolveBridgeMac: stpCtrl.resolveBridgeMac,
  });
  const ctrl = setupExpandCollapse(cy, nodes, edges, fcoseLargeProvider, NODE_HIERARCHY, 'none', { ...panelOpts, onCompare: compare.add, onCompareHas: compare.has });
  compare.setLocate(id => ctrl.focusNode(id));
  panelOpts.setFocusNode(id => ctrl.focusNode(id));
  panelOpts.setChildCountResolver(id => ctrl.getDirectChildCount(id));
  panelOpts.setChildrenResolver(id => ctrl.getDirectChildren(id));
  setupToolbar(ctrl, NODE_HIERARCHY, 'none');
  setupSearch(ctrl, nodes);
  setupZoomFitButton(cy);
  setupCompareButton(compare.open);
  const VLAN_PALETTE = ['#e11d48', '#d97706', '#16a34a', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#2563eb'];
  let vlanActive = false;
  let hwIdToColor = new Map<string, string>();  // hw_id → hex
  let vlanIdToColor = new Map<string, string>(); // vlan_id → hex (for legend)
  let vlanCacheReady = false;

  cy.on('add', 'node', event => {
    if (!vlanActive || !vlanCacheReady) return;
    const node = event.target as cytoscape.NodeSingular;
    const color = hwIdToColor.get(node.data('hw_id') as string);
    if (color) node.data('vlan_color', color);
  });

  async function loadVlanData(): Promise<void> {
    if (vlanCacheReady) return;
    const query = { explorer_network_id: NETWORK_ID, snapshot_id: SNAPSHOT_ID };
    const responses = await Promise.allSettled(
      deviceNodeIds.map(id => getDevice({ path: { device_id: id }, query })),
    );

    const hwToVlan = new Map<string, string>(); // hw_id → vlan_id string
    for (const r of responses) {
      if (r.status !== 'fulfilled') continue;
      // SDK returns { data: DeviceResponse, error } — DeviceResponse.data is DeviceInfoOutput
      const { data: resp } = r.value;
      const hosts = resp?.data?.data?.hosts;
      if (!hosts) continue;
      for (const [hwId, info] of Object.entries(hosts)) {
        const vid = info.vlan_ids?.[0] ?? info.vlan_id;
        if (vid != null) hwToVlan.set(hwId, String(vid));
      }
    }

    const uniqueVlans = [...new Set(hwToVlan.values())].sort((a, b) => Number(a) - Number(b));
    vlanIdToColor = new Map(uniqueVlans.map((id, i) => [id, VLAN_PALETTE[i % VLAN_PALETTE.length]]));
    hwIdToColor = new Map([...hwToVlan.entries()].map(([hw, vid]) => [hw, vlanIdToColor.get(vid)!]));
    vlanCacheReady = true;
  }

  function renderVlanLegend(): void {
    if (vlanIdToColor.size === 0) return;
    const legend = document.createElement('div');
    legend.id = '__vlan_legend__';
    legend.style.cssText = 'position:absolute;bottom:12px;left:12px;background:rgba(255,255,255,0.96);border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.10);z-index:100;pointer-events:none;';
    legend.innerHTML =
      `<div style="font-weight:700;color:#888;font-size:9px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;">VLANs</div>` +
      [...vlanIdToColor.entries()].map(([id, color]) =>
        `<div style="display:flex;align-items:center;gap:6px;padding:1px 0;">` +
        `<span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>` +
        `<span style="color:#333;">VLAN ${id}</span></div>`
      ).join('');
    cy.container()?.append(legend);
  }

  setupVlanToggle(active => {
    vlanActive = active;
    document.getElementById('__vlan_legend__')?.remove();

    if (active) {
      loadVlanData().then(() => {
        if (!vlanActive) return;
        cy.nodes().forEach(n => {
          const node = n as cytoscape.NodeSingular;
          const color = hwIdToColor.get(node.data('hw_id') as string);
          if (color) node.data('vlan_color', color);
        });
        renderVlanLegend();
      });
    } else {
      cy.nodes().removeData('vlan_color');
      cy.style().update();
    }
  });
  setupLegend();
  stpCtrl.start(panelOpts);
  runLayout(cy, POSITIONS_KEY, fcoseLargeProvider, 0.2);
}
