import type { DeviceInfoOutput, VlanInfo } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildVlansSection(info: DeviceInfoOutput): PanelSection {
  const vlans = info.vlans ? Object.values(info.vlans) : [];
  return { label: 'VLANs', content: buildContent(vlans), disabled: vlans.length === 0 };
}

function buildContent(vlans: VlanInfo[]): HTMLElement {
  const rows = vlans.map(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${v.vlan_id}</td><td class="td-left">${v.vlan_name ?? '—'}</td>`;
    return tr;
  });
  return buildPaginatedTable(['VLAN ID', 'Name'], rows);
}
