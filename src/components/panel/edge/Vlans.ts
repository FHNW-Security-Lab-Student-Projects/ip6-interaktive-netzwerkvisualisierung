import type { PortInfo } from '../../../generated/types.gen.ts';
import { buildPaginatedTable } from '../table.ts';
import { findPort, type ConnEntry } from './Connections.ts';

export function buildVlansSection(
  srcName: string,
  tgtName: string,
  connEntries: ConnEntry[],
  srcPorts: PortInfo[],
  tgtPorts: PortInfo[],
): { content: HTMLElement; disabled: boolean } {
  const pairs = connEntries.map(e => ({
    entry: e,
    sp: findPort(srcPorts, e.ifLocal),
    tp: findPort(tgtPorts, e.ifRemote),
  }));

  const hasData = pairs.some(({ sp, tp }) =>
    sp?.tagged || sp?.untagged != null || sp?.vlan_id != null ||
    tp?.tagged || tp?.untagged != null || tp?.vlan_id != null,
  );

  if (!hasData) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No VLAN data available.';
    return { content: el, disabled: true };
  }

  const makeRow = (
    label: string,
    srcVal: string | number | null,
    tgtVal: string | number | null,
    mismatch: boolean,
  ): HTMLTableRowElement => {
    const tr = document.createElement('tr');
    if (mismatch) tr.className = 'vlan-mismatch';
    const tdL = document.createElement('td'); tdL.className = 'td-left'; tdL.textContent = label;
    const tdS = document.createElement('td'); tdS.textContent = srcVal != null ? String(srcVal) : '—';
    const tdT = document.createElement('td'); tdT.textContent = tgtVal != null ? String(tgtVal) : '—';
    tr.append(tdL, tdS, tdT);
    return tr;
  };

  const rows: HTMLTableRowElement[] = [];
  for (const { entry, sp, tp } of pairs) {
    // Only add interface separator rows when there are multiple connections,
    // otherwise the single pair is already clear from context.
    if (connEntries.length > 1) {
      const sep = document.createElement('tr');
      sep.className = 'vlan-iface-sep';
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = `${entry.ifLocal} ↔ ${entry.ifRemote}`;
      sep.append(td);
      rows.push(sep);
    }

    const spNative = sp?.untagged ?? sp?.vlan_id ?? null;
    const tpNative = tp?.untagged ?? tp?.vlan_id ?? null;
    const spTagged = sp?.tagged ?? null;
    const tpTagged = tp?.tagged ?? null;

    rows.push(makeRow(
      'Native', spNative, tpNative,
      (spNative !== null || tpNative !== null) && spNative !== tpNative,
    ));
    rows.push(makeRow(
      'Tagged', spTagged, tpTagged,
      (spTagged !== null || tpTagged !== null) && spTagged !== tpTagged,
    ));
  }

  return { content: buildPaginatedTable(['', srcName, tgtName], rows), disabled: false };
}
