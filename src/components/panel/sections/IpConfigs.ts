import type { DeviceInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildTableSection } from '../utils.ts';

export function buildIpConfigsSection(info: DeviceInfoOutput): PanelSection {
  const ipconfigs = info.ip_configs ? Object.values(info.ip_configs) : [];
  return buildTableSection('IP Configs', ipconfigs, ['Interface', 'IP Addresses', 'Status', 'VRF'], c => {
    const tr = document.createElement('tr');
    const ips = (c.ip_interfaces ?? []).join(', ') || '—';
    tr.innerHTML = `<td class="td-left">${c.interface_name}</td><td class="td-left">${ips}</td><td>${c.port_status ?? '—'}</td><td class="td-left">${c.vrf || '—'}</td>`;
    return tr;
  });
}
