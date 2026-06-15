import type { DeviceInfoOutput, PortInfo } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';

export function buildPortsSection(info: DeviceInfoOutput): PanelSection {
  const ports = info.ports ? Object.values(info.ports) : [];
  return { label: 'Ports', content: buildContent(ports), disabled: ports.length === 0 };
}

function buildContent(ports: PortInfo[]): HTMLElement {
  const rows = ports.map(p => {
    const tr = document.createElement('tr');
    const state = p.if_state ?? 'unknown';
    tr.innerHTML = `
      <td>${p.if_no_short ?? p.if_no}</td>
      <td><span class="port-state port-state--${state}">${state}</span></td>
      <td>${p.port_type ?? '—'}</td>
      <td>${p.tagged ?? p.vlan_id ?? '—'}</td>
      <td class="td-left">${p.description || '—'}</td>
    `;
    return tr;
  });
  return buildPaginatedTable(['Interface', 'State', 'Type', 'VLAN/Tagged', 'Description'], rows);
}
