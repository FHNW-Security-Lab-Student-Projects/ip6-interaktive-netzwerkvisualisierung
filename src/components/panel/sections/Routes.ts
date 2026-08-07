import type { DeviceInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildTableSection } from '../utils.ts';

export function buildRoutesSection(info: DeviceInfoOutput): PanelSection {
  const routes = info.routes ? Object.values(info.routes) : [];
  return buildTableSection('Routes', routes, ['Network', 'Protocol', 'Next-hop', 'VRF'], r => {
    const tr = document.createElement('tr');
    const nexthop = r.nexthop_ip || r.nexthop_if || '—';
    tr.innerHTML = `<td>${r.network}/${r.mask ?? ''}</td><td>${r.protocol ?? '—'}</td><td>${nexthop}</td><td class="td-left">${r.vrf || '—'}</td>`;
    return tr;
  });
}
