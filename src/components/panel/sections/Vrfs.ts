import type { DeviceInfoOutput, VrfInfo } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildVrfsSection(info: DeviceInfoOutput): PanelSection {
  const vrfs = info.vrfs ? Object.values(info.vrfs) : [];
  return { label: 'VRFs', content: buildContent(vrfs), disabled: vrfs.length === 0 };
}

function buildContent(vrfs: VrfInfo[]): HTMLElement {
  const rows = vrfs.map(v => {
    const tr = document.createElement('tr');
    const ifaces = (v.interfaces ?? []).join(', ') || '—';
    tr.innerHTML = `<td class="td-left">${v.vrf_name}</td><td>${v.proto ?? '—'}</td><td class="td-left">${ifaces}</td>`;
    return tr;
  });
  return buildPaginatedTable(['VRF', 'Protocol', 'Interfaces'], rows);
}
