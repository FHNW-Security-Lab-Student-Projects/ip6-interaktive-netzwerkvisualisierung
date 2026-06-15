import type { DeviceInfoOutput, SpanningTreeInstanceOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildSpanningTreeSection(info: DeviceInfoOutput): PanelSection {
  const instances = info.stp?.instances ? Object.values(info.stp.instances) : [];
  return { label: 'Spanning Tree', content: buildContent(instances), disabled: !info.stp };
}

function buildContent(instances: SpanningTreeInstanceOutput[]): HTMLElement {
  if (instances.length === 0) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No spanning tree data available.';
    return el;
  }
  const rows = instances.map(inst => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${inst.instance_id}</td>
      <td>${inst.mapped_vlans}</td>
      <td>${inst.is_root ? '✓' : '—'}</td>
      <td>${inst.root_port ?? '—'}</td>
      <td>${inst.root_priority}</td>
    `;
    return tr;
  });
  return buildPaginatedTable(['Instance', 'VLANs', 'Root', 'Root Port', 'Priority'], rows);
}
