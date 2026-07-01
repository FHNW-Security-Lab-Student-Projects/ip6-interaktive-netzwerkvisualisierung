import type { DeviceInfoOutput, NeighborInfoOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';
import { makeNodeName } from '../utils.ts';

export function buildNeighborsSection(info: DeviceInfoOutput, onNodeSelect?: (nodeId: string) => void, neighTypeResolver?: (nodeId: string) => string | undefined): PanelSection {
  const neighbors = info.neighbors ? Object.values(info.neighbors) : [];
  return { label: 'Neighbors', content: buildContent(neighbors, onNodeSelect, neighTypeResolver), disabled: neighbors.length === 0 };
}

function buildContent(neighbors: NeighborInfoOutput[], onNodeSelect?: (nodeId: string) => void, neighTypeResolver?: (nodeId: string) => string | undefined): HTMLElement {
  const pairs: Array<{ n: NeighborInfoOutput; ifLocal: string }> = [];
  for (const n of neighbors) {
    if (n.connections) {
      for (const conn of Object.values(n.connections)) {
        pairs.push({ n, ifLocal: conn.if_local });
      }
    } else {
      pairs.push({ n, ifLocal: '—' });
    }
  }
  pairs.sort((a, b) => a.ifLocal.localeCompare(b.ifLocal, undefined, { numeric: true }));

  const rows = pairs.map(({ n, ifLocal }) => {
    const tr = document.createElement('tr');

    const tdIface = document.createElement('td');
    tdIface.textContent = ifLocal;

    const tdNeigh = document.createElement('td');
    const nameText = n.name || n.ip_address || n.neigh_id;
    tdNeigh.append(makeNodeName(nameText, n.neigh_id, onNodeSelect));
    if (!n.name || n.status === 'unknown') {
      const disc = document.createElement('span');
      disc.className = 'neigh-disc';
      disc.textContent = 'discovered';
      tdNeigh.append(document.createElement('br'), disc);
    }

    const tdType = document.createElement('td');
    tdType.textContent = neighTypeResolver?.(n.neigh_id) ?? '—';

    const tdAddr = document.createElement('td');
    tdAddr.textContent = n.ip_address ?? '—';

    tr.append(tdIface, tdNeigh, tdType, tdAddr);
    return tr;
  });

  return buildPaginatedTable(['Local Interface', 'Neighbor Device', 'Type', 'Neighbor Address'], rows);
}
