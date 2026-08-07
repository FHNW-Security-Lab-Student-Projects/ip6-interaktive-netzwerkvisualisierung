import type { DeviceInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildTableSection } from '../utils.ts';

export function buildVlansSection(info: DeviceInfoOutput): PanelSection {
  const vlans = info.vlans ? Object.values(info.vlans) : [];
  return buildTableSection('VLANs', vlans, ['VLAN ID', 'Name'], v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${v.vlan_id}</td><td class="td-left">${v.vlan_name ?? '—'}</td>`;
    return tr;
  });
}
