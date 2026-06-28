import type { DeviceInfoOutput, SpanningTreeOutput } from '../../../generated/types.gen.ts';
import { buildPaginatedTable } from '../table.ts';
import type { ConnEntry } from './Connections.ts';
import { makeNodeName } from '../utils.ts';

function findStpInterface(stp: SpanningTreeOutput | null | undefined, ifName: string) {
  if (!stp?.instances) return null;
  for (const instance of Object.values(stp.instances)) {
    const iface = instance.interfaces?.find(i => i.if_no === ifName || i.if_no_short === ifName);
    if (iface) return iface;
  }
  return null;
}

export function buildStpSection(
  srcId: string, srcName: string,
  tgtId: string, tgtName: string,
  connEntries: ConnEntry[],
  srcInfo: DeviceInfoOutput | null,
  tgtInfo: DeviceInfoOutput | null,
  onNodeSelect?: (nodeId: string) => void,
): { content: HTMLElement; disabled: boolean } {
  if (!srcInfo?.stp && !tgtInfo?.stp) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No spanning tree data available.';
    return { content: el, disabled: true };
  }

  const stpRows = connEntries
    .map(entry => ({
      label: entry.ifLocal,
      srcStp: findStpInterface(srcInfo?.stp, entry.ifLocal),
      tgtStp: findStpInterface(tgtInfo?.stp, entry.ifRemote),
    }))
    .filter(r => r.srcStp ?? r.tgtStp);

  if (stpRows.length === 0) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No spanning tree data available.';
    return { content: el, disabled: true };
  }

  const rows = stpRows.map(row => {
    const tr = document.createElement('tr');

    const tdL = document.createElement('td');
    tdL.className = 'td-left';
    tdL.textContent = row.label;

    const makeStpCell = (iface: ReturnType<typeof findStpInterface>): HTMLTableCellElement => {
      const td = document.createElement('td');
      if (iface) {
        if (iface.state === 'Blocking') td.className = 'stp-blocking';
        td.textContent = `${iface.role ?? '—'} · ${iface.state}`;
      } else {
        td.textContent = '—';
      }
      return td;
    };

    tr.append(tdL, makeStpCell(row.srcStp), makeStpCell(row.tgtStp));
    return tr;
  });

  return { content: buildPaginatedTable(['', makeNodeName(srcName, srcId, onNodeSelect), makeNodeName(tgtName, tgtId, onNodeSelect)], rows), disabled: false };
}
