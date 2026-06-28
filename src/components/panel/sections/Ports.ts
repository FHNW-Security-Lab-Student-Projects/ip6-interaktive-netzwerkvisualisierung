import type { DeviceInfoOutput, PortInfo } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';
import { normalizeStr, normalizeVlanId } from '../normalize.ts';
import { makeNodeName } from '../utils.ts';

type NeighEntry = { neighId: string; neighName: string };

export function buildPortsSection(info: DeviceInfoOutput, onNodeSelect?: (nodeId: string) => void): PanelSection {
  const ports = info.ports ? Object.values(info.ports) : [];
  return { label: 'Ports', content: buildContent(ports, buildNeighborMap(info), onNodeSelect), disabled: ports.length === 0 };
}

function buildNeighborMap(info: DeviceInfoOutput): Map<string, NeighEntry[]> {
  // Two separate maps so multiple entries per port accumulate independently within
  // each source, then neighbors win over hosts at merge time.
  const hostMap = new Map<string, NeighEntry[]>();
  const neighMap = new Map<string, NeighEntry[]>();

  const addTo = (map: Map<string, NeighEntry[]>, key: string, entry: NeighEntry) => {
    const arr = map.get(key);
    if (arr) arr.push(entry);
    else map.set(key, [entry]);
  };

  for (const host of Object.values(info.hosts ?? {})) {
    if (!host.hw_id) continue;
    const neighName = host.addresses?.[0]?.ipv4 ?? host.vendor ?? host.hw_id;
    const entry: NeighEntry = { neighId: host.hw_id, neighName };
    addTo(hostMap, host.port_if_no, entry);
    if (host.port_if_no_short) addTo(hostMap, host.port_if_no_short, entry);
  }

  for (const neigh of Object.values(info.neighbors ?? {})) {
    const neighName = neigh.name || neigh.ip_address || neigh.neigh_id;
    for (const conn of Object.values(neigh.connections ?? {})) {
      addTo(neighMap, conn.if_local, { neighId: neigh.neigh_id, neighName });
    }
  }

  // Neighbors replace hosts for the same port: a neighbor's panel already surfaces
  // its downstream hosts, so showing individual hosts behind it is redundant.
  const result = new Map<string, NeighEntry[]>(hostMap);
  for (const [key, entries] of neighMap) result.set(key, entries);
  return result;
}

function buildContent(
  ports: PortInfo[],
  neighborMap: Map<string, NeighEntry[]>,
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const rows = ports.map(p => {
    const tr = document.createElement('tr');
    const state = p.if_state ?? 'unknown';
    tr.innerHTML = `
      <td>${p.if_no_short ?? p.if_no}</td>
      <td><span class="port-state port-state--${state}">${state}</span></td>
      <td>${p.port_type ?? '—'}</td>
      <td>${normalizeStr(p.tagged) ?? normalizeVlanId(p.vlan_id) ?? '—'}</td>
      <td class="td-left">${p.description || '—'}</td>
    `;

    const neighTd = document.createElement('td');
    const entries = neighborMap.get(p.if_no) ?? neighborMap.get(p.if_no_short ?? '');
    if (entries && entries.length > 0) {
      if (entries.length === 1) {
        neighTd.append(makeNodeName(entries[0].neighName, entries[0].neighId, onNodeSelect));
      } else {
        const stack = document.createElement('div');
        stack.className = 'neigh-stack';
        for (const entry of entries) stack.append(makeNodeName(entry.neighName, entry.neighId, onNodeSelect));
        neighTd.append(stack);
      }
    } else {
      neighTd.textContent = '—';
    }
    tr.append(neighTd);

    return tr;
  });

  return buildPaginatedTable(['Interface', 'State', 'Type', 'VLAN/Tagged', 'Description', 'Connected Node'], rows);
}
