import type { DeviceInfoOutput, IpRoute } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildRoutesSection(info: DeviceInfoOutput): PanelSection {
  const routes = info.routes ? Object.values(info.routes) : [];
  return { label: 'Routes', content: buildContent(routes), disabled: routes.length === 0 };
}

function buildContent(routes: IpRoute[]): HTMLElement {
  const rows = routes.map(r => {
    const tr = document.createElement('tr');
    const nexthop = r.nexthop_ip || r.nexthop_if || '—';
    tr.innerHTML = `<td>${r.network}/${r.mask ?? ''}</td><td>${r.protocol ?? '—'}</td><td>${nexthop}</td><td class="td-left">${r.vrf || '—'}</td>`;
    return tr;
  });
  return buildPaginatedTable(['Network', 'Protocol', 'Next-hop', 'VRF'], rows);
}
