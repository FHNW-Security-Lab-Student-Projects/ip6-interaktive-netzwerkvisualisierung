import type { DeviceInfoOutput, NeighborInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';
import { makeNodeName } from '../utils.ts';

export function buildNeighborsSection(info: DeviceInfoOutput, onNodeSelect?: (nodeId: string) => void): PanelSection {
  const neighbors = info.neighbors ? Object.values(info.neighbors) : [];
  return { label: 'Neighbors', content: buildContent(neighbors, onNodeSelect), disabled: neighbors.length === 0 };
}

function buildContent(neighbors: NeighborInfoOutput[], onNodeSelect?: (nodeId: string) => void): HTMLElement {
  const rows: HTMLTableRowElement[] = [];
  for (const n of neighbors) {
    const connections = n.connections
      ? Object.values(n.connections)
      : [{ if_local: '—', if_remote: '—', discovery_types: [] as string[] }];

    for (const conn of connections) {
      const tr = document.createElement('tr');

      const tdIface = document.createElement('td');
      tdIface.textContent = conn.if_local;

      const tdNeigh = document.createElement('td');
      const nameText = n.name || n.ip_address || n.neigh_id;
      tdNeigh.append(makeNodeName(nameText, n.neigh_id, onNodeSelect));
      if (!n.name || n.status === 'unknown') {
        const disc = document.createElement('span');
        disc.className = 'neigh-disc';
        disc.textContent = 'discovered';
        tdNeigh.append(document.createElement('br'), disc);
      }

      const tdAddr = document.createElement('td');
      tdAddr.textContent = n.ip_address ?? '—';

      tr.append(tdIface, tdNeigh, tdAddr);
      rows.push(tr);
    }
  }
  return buildPaginatedTable(['Local Interface', 'Neighbor Device', 'Neighbor Address'], rows);
}
