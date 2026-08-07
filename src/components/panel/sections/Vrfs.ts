import type { DeviceInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildTableSection } from '../utils.ts';

export function buildVrfsSection(info: DeviceInfoOutput): PanelSection {
  const vrfs = info.vrfs ? Object.values(info.vrfs) : [];
  return buildTableSection('VRFs', vrfs, ['VRF', 'Protocol', 'Interfaces'], v => {
    const tr = document.createElement('tr');
    const ifaces = (v.interfaces ?? []).join(', ') || '—';
    tr.innerHTML = `<td class="td-left">${v.vrf_name}</td><td>${v.proto ?? '—'}</td><td class="td-left">${ifaces}</td>`;
    return tr;
  });
}
