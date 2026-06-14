import type { DeviceInfoOutput, LagInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildLagsSection(info: DeviceInfoOutput): PanelSection {
  const lags = info.lags ? Object.values(info.lags) : [];
  return { label: 'Link aggregation groups', content: buildContent(lags), disabled: lags.length === 0 };
}

function buildContent(lags: LagInfoOutput[]): HTMLElement {
  if (lags.length === 0) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No link aggregation groups configured.';
    return el;
  }
  const rows = lags.map(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${l.group_id}</td><td>${l.name}</td><td>${l.protocol ?? '—'}</td>`;
    return tr;
  });
  return buildPaginatedTable(['Group ID', 'Name', 'Protocol'], rows);
}
