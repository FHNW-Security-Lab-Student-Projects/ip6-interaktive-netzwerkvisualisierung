import type { DeviceInfoOutput, IpConfigInfo } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildIpConfigsSection(info: DeviceInfoOutput): PanelSection {
  const ipconfigs = info.ip_configs ? Object.values(info.ip_configs) : [];
  return { label: 'IP Configs', content: buildContent(ipconfigs), disabled: ipconfigs.length === 0 };
}

function buildContent(configs: IpConfigInfo[]): HTMLElement {
  const rows = configs.map(c => {
    const tr = document.createElement('tr');
    const ips = (c.ip_interfaces ?? []).join(', ') || '—';
    tr.innerHTML = `<td class="td-left">${c.interface_name}</td><td class="td-left">${ips}</td><td>${c.port_status ?? '—'}</td><td class="td-left">${c.vrf || '—'}</td>`;
    return tr;
  });
  return buildPaginatedTable(['Interface', 'IP Addresses', 'Status', 'VRF'], rows);
}
