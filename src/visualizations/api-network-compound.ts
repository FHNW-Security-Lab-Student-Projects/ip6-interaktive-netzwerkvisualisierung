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
import { setupDetailPanel, setupToolbar, setupSearch } from '../components/index.ts';
import { buildDeviceMap, enrichEdges, applyEdgeState, collectStpInstances } from '../edge-enricher.ts';

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

  let selectedStpKey: string | null = null;
  const macToDevice = new Map<string, { id: string; name: string } | null>();

  const panelOpts = setupDetailPanel(cy, {
    networkId: NETWORK_ID,
    snapshotId: SNAPSHOT_ID,
    getStpInstanceKey: () => selectedStpKey,
    resolveBridgeMac: (mac) => macToDevice.get(mac) ?? null,
  });
  const ctrl = setupExpandCollapse(cy, nodes, edges, fcoseLargeProvider, NODE_HIERARCHY, 'none', panelOpts);
  panelOpts.setFocusNode(id => ctrl.focusNode(id));
  setupToolbar(ctrl, NODE_HIERARCHY, 'none');
  setupSearch(ctrl, nodes);
  runLayout(cy, POSITIONS_KEY, fcoseLargeProvider, 0.2);

  const deviceNodeIds = raw.nodes
    .filter(n => n.data.node_type === 'device')
    .map(n => n.data.id as string);

  // Show STP picker immediately with just "None"; instances are added once device data loads
  const toolbar = document.getElementById('toolbar');
  let stpSelect: HTMLSelectElement | null = null;
  if (toolbar) {
    const label = document.createElement('span');
    label.textContent = 'STP';
    stpSelect = document.createElement('select');
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'None';
    stpSelect.append(noneOpt);
    toolbar.append(label, stpSelect);
  }

  buildDeviceMap(deviceNodeIds, { networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID }).then(deviceMap => {
    for (const [deviceId, info] of deviceMap) {
      for (const inst of Object.values(info.stp?.instances ?? {})) {
        const mac = inst.bridge_address?.address;
        if (mac) {
          if (macToDevice.has(mac)) {
            macToDevice.set(mac, null); // collision: two devices share this bridge MAC
          } else {
            macToDevice.set(mac, { id: deviceId, name: info.name });
          }
        }
      }
    }
    enrichEdges(cy, deviceMap);

    const stpInstances = collectStpInstances(deviceMap);
    if (stpInstances.length >= 1 && stpSelect) {
      const byProtocol = new Map<string, typeof stpInstances>();
      for (const inst of stpInstances) {
        if (!byProtocol.has(inst.protocol)) byProtocol.set(inst.protocol, []);
        byProtocol.get(inst.protocol)!.push(inst);
      }
      for (const [proto, group] of byProtocol) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = proto;
        for (const { key, label: lbl } of group) {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = lbl;
          optgroup.append(opt);
        }
        stpSelect.append(optgroup);
      }
    }

    stpSelect?.addEventListener('change', () => {
      selectedStpKey = stpSelect!.value || null;
      enrichEdges(cy, deviceMap, selectedStpKey);
      panelOpts.refreshCurrentPanel();
    });

    cy.on('add', 'edge', evt => applyEdgeState(evt.target as cytoscape.EdgeSingular, deviceMap, selectedStpKey));
  });
}
