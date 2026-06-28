import type { DeviceInfoOutput, PortInfo } from '../../../generated/types.gen.ts';
import type { AccordionItem } from '../../Accordion.ts';
import { makeStatusDot, makeChip, makeNodeName } from '../utils.ts';
import { buildPaginatedTable } from '../table.ts';
import { normalizeStr } from '../normalize.ts';

export type ConnEntry = { ifLocal: string; ifRemote: string };

export function findPort(ports: PortInfo[], ifName: string): PortInfo | undefined {
  return ports.find(p => p.if_no === ifName || p.if_no_short === ifName);
}

export function pairStatus(sp: PortInfo | undefined, tp: PortInfo | undefined): 'online' | 'down' {
  // err-disabled is functionally down — port blocked by switch, no traffic passes
  const isDown = (p: PortInfo | undefined) => p?.if_state === 'down' || p?.if_state === 'err-disabled';
  return isDown(sp) || isDown(tp) ? 'down' : 'online';
}

function buildConnectionLabelEl(
  ifLocal: string,
  ifRemote: string,
  portType: string | null | undefined,
  connState: 'online' | 'down',
  srcLagName: string | null,
  tgtLagName: string | null,
  typeClasses: string[],
): HTMLElement {
  const el = document.createElement('span');
  el.className = 'accordion-label-content';

  const dot = makeStatusDot(connState);
  dot.classList.add('accordion-label-dot');

  const text = document.createElement('span');
  text.textContent = `${ifLocal} ↔ ${ifRemote}`;

  el.append(dot, text);

  if (portType && portType !== 'unknown') el.append(makeChip(portType));

  const lagNames = [...new Set([srcLagName, tgtLagName].filter(Boolean))] as string[];
  for (const n of lagNames) el.append(makeChip(`LAG: ${n}`));

  // 'lag' is already communicated via the LAG: name chip; show chips for other edge types
  for (const cls of typeClasses.filter(c => c !== 'lag')) el.append(makeChip(cls));

  return el;
}

function buildConnectionContent(
  srcId: string, srcName: string, srcIf: string, srcPort: PortInfo | undefined,
  tgtId: string, tgtName: string, tgtIf: string, tgtPort: PortInfo | undefined,
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const makeRow = (label: string, srcVal: string, tgtVal: string, warn = false): HTMLTableRowElement => {
    const tr = document.createElement('tr');
    if (warn) tr.className = 'table-row-warn';
    const tdL = document.createElement('td'); tdL.className = 'td-left'; tdL.textContent = label;
    const tdS = document.createElement('td'); tdS.textContent = srcVal;
    const tdT = document.createElement('td'); tdT.textContent = tgtVal;
    tr.append(tdL, tdS, tdT);
    return tr;
  };

  const knownVal = (v: string | null | undefined) => !!(v && v !== 'auto' && v !== 'unknown');

  const rows: HTMLTableRowElement[] = [
    makeRow('Interface', srcIf, tgtIf),
    makeRow(
      'Type',
      normalizeStr(srcPort?.port_type) ?? '—',
      normalizeStr(tgtPort?.port_type) ?? '—',
      !!(srcPort?.port_type && tgtPort?.port_type &&
         srcPort.port_type !== 'unknown' && tgtPort.port_type !== 'unknown' &&
         srcPort.port_type !== tgtPort.port_type),
    ),
    makeRow(
      'State',
      normalizeStr(srcPort?.if_state) ?? '—',
      normalizeStr(tgtPort?.if_state) ?? '—',
      !!(
        (srcPort?.if_state && tgtPort?.if_state && srcPort.if_state !== tgtPort.if_state) ||
        srcPort?.if_state === 'err-disabled' ||
        tgtPort?.if_state === 'err-disabled'
      ),
    ),
    makeRow(
      'Speed',
      normalizeStr(srcPort?.speed) ?? '—',
      normalizeStr(tgtPort?.speed) ?? '—',
      knownVal(srcPort?.speed) && knownVal(tgtPort?.speed) && srcPort?.speed !== tgtPort?.speed,
    ),
    makeRow(
      'Duplex',
      normalizeStr(srcPort?.duplex) ?? '—',
      normalizeStr(tgtPort?.duplex) ?? '—',
      knownVal(srcPort?.duplex) && knownVal(tgtPort?.duplex) && srcPort?.duplex !== tgtPort?.duplex,
    ),
  ];

  const srcDesc = srcPort?.description ?? null;
  const tgtDesc = tgtPort?.description ?? null;
  if (srcDesc || tgtDesc) rows.push(makeRow('Description', srcDesc ?? '—', tgtDesc ?? '—'));

  return buildPaginatedTable(
    ['', makeNodeName(srcName, srcId, onNodeSelect), makeNodeName(tgtName, tgtId, onNodeSelect)],
    rows,
  );
}

export function buildConnectionItems(
  connEntries: ConnEntry[],
  srcId: string, srcName: string, srcPorts: PortInfo[],
  tgtId: string, tgtName: string, tgtPorts: PortInfo[],
  srcInfo: DeviceInfoOutput | null,
  tgtInfo: DeviceInfoOutput | null,
  typeClasses: string[],
  openAccordions: Set<string>,
  onNodeSelect?: (nodeId: string) => void,
): AccordionItem[] {
  const findLagName = (info: DeviceInfoOutput | null, ifName: string): string | null =>
    Object.values(info?.lags ?? {}).find(lag => lag.members[ifName] !== undefined)?.name ?? null;

  return connEntries.map(entry => {
    const sp = findPort(srcPorts, entry.ifLocal);
    const tp = findPort(tgtPorts, entry.ifRemote);
    const connState = pairStatus(sp, tp);
    const key = `${entry.ifLocal} ↔ ${entry.ifRemote}`;
    const srcLagName = findLagName(srcInfo, entry.ifLocal);
    const tgtLagName = findLagName(tgtInfo, entry.ifRemote);
    return {
      label: buildConnectionLabelEl(entry.ifLocal, entry.ifRemote, sp?.port_type, connState, srcLagName, tgtLagName, typeClasses),
      key,
      content: buildConnectionContent(
        srcId, srcName, entry.ifLocal, sp,
        tgtId, tgtName, entry.ifRemote, tp,
        onNodeSelect,
      ),
      open: openAccordions.has(key),
    };
  });
}
