import type cytoscape from 'cytoscape';
import type { BasegraphQuery } from '../graph-loader.ts';
import { getDevice } from '../generated/sdk.gen.ts';
import { setupVlanToggle } from './Toolbar.ts';

const VLAN_PALETTE = ['#e11d48', '#d97706', '#16a34a', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#2563eb'];

export function setupVlanOverlay(
  cy: cytoscape.Core,
  deviceNodeIds: string[],
  query: BasegraphQuery,
): void {
  let vlanActive = false;
  let hwIdToColor = new Map<string, string>();
  let vlanIdToColor = new Map<string, string>();
  let vlanCacheReady = false;

  cy.on('add', 'node', event => {
    if (!vlanActive || !vlanCacheReady) return;
    const node = event.target as cytoscape.NodeSingular;
    const color = hwIdToColor.get(node.data('hw_id') as string);
    if (color) node.data('vlan_color', color);
  });

  async function loadVlanData(): Promise<void> {
    if (vlanCacheReady) return;
    const apiQuery = { explorer_network_id: query.networkId, snapshot_id: query.snapshotId };
    const responses = await Promise.allSettled(
      deviceNodeIds.map(id => getDevice({ path: { device_id: id }, query: apiQuery })),
    );

    const hwToVlan = new Map<string, string>();
    for (const r of responses) {
      if (r.status !== 'fulfilled') continue;
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
}
