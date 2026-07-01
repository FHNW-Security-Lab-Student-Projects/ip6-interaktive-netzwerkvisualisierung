import type { DeviceInfoOutput, SpanningTreeInterface, SpanningTreeOutput } from '../../../generated/types.gen.ts';
import { buildPaginatedTable } from '../table.ts';
import { buildStpControls, makeRootBridgeEl, type StpEntry } from '../stp-shared.ts';
import type { ConnEntry } from './Connections.ts';
import { makeNodeName } from '../utils.ts';

function findStpInterface(
  stp: SpanningTreeOutput | null | undefined,
  ifName: string,
  instanceKey?: string | null,
): SpanningTreeInterface | null {
  if (!stp?.instances) return null;
  if (instanceKey) {
    const inst = stp.instances[instanceKey];
    return inst?.interfaces?.find(i => i.if_no === ifName || i.if_no_short === ifName) ?? null;
  }
  for (const instance of Object.values(stp.instances)) {
    const iface = instance.interfaces?.find(i => i.if_no === ifName || i.if_no_short === ifName);
    if (iface) return iface;
  }
  return null;
}

function makeStpCell(iface: SpanningTreeInterface | null): HTMLTableCellElement {
  const td = document.createElement('td');
  if (iface) {
    if (iface.state === 'Blocking') td.className = 'stp-blocking';
    td.textContent = `${iface.role ?? '—'} · ${iface.state}`;
  } else {
    td.textContent = '—';
  }
  return td;
}

export function buildStpSection(
  srcId: string, srcName: string,
  tgtId: string, tgtName: string,
  connEntries: ConnEntry[],
  srcInfo: DeviceInfoOutput | null,
  tgtInfo: DeviceInfoOutput | null,
  onNodeSelect?: (nodeId: string) => void,
  defaultInstanceKey?: string | null,
  macResolver?: (mac: string) => { id: string; name: string } | null,
): { content: HTMLElement; disabled: boolean } {
  if (!srcInfo?.stp && !tgtInfo?.stp) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No spanning tree data available.';
    return { content: el, disabled: true };
  }

  // Check if any connection entry has STP data in any instance
  const hasAnyStp = connEntries.some(e =>
    findStpInterface(srcInfo?.stp, e.ifLocal) !== null ||
    findStpInterface(tgtInfo?.stp, e.ifRemote) !== null,
  );
  if (!hasAnyStp) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No spanning tree data available.';
    return { content: el, disabled: true };
  }

  // Collect available instances (union of src + tgt), carry protocol for grouping
  const entries: StpEntry[] = [];
  for (const stp of [srcInfo?.stp, tgtInfo?.stp]) {
    if (!stp?.instances) continue;
    for (const [key, inst] of Object.entries(stp.instances)) {
      if (!entries.some(e => e.key === key)) {
        entries.push({ key, label: inst.mapped_vlans ? `${key} (${inst.mapped_vlans})` : key, protocol: stp.protocol });
      }
    }
  }
  entries.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

  const wrapper = document.createElement('div');
  const tableContainer = document.createElement('div');

  const { el: headerEl, initialKey } = buildStpControls(entries, defaultInstanceKey ?? null, (key) => {
    selectedKey = key;
    renderTable();
  });
  let selectedKey: string | null = initialKey;

  if (entries.length > 0) wrapper.append(headerEl);
  wrapper.append(tableContainer);

  const tableHeaders = ['', makeNodeName(srcName, srcId, onNodeSelect), makeNodeName(tgtName, tgtId, onNodeSelect)];

  function renderTable() {
    tableContainer.innerHTML = '';
    if (!selectedKey) {
      const el = document.createElement('div');
      el.className = 'section-empty';
      el.textContent = 'Select an instance to view STP details.';
      tableContainer.append(el);
      return;
    }

    const srcInst = srcInfo?.stp?.instances?.[selectedKey];
    const tgtInst = tgtInfo?.stp?.instances?.[selectedKey];

    const rootRow = document.createElement('tr');
    rootRow.className = 'stp-root-row';
    const tdRootLabel = document.createElement('td');
    tdRootLabel.className = 'td-left';
    tdRootLabel.textContent = 'Root Bridge';
    const tdRootSrc = document.createElement('td');
    tdRootSrc.append(makeRootBridgeEl(srcInst, srcId, srcName, macResolver, onNodeSelect));
    const tdRootTgt = document.createElement('td');
    tdRootTgt.append(makeRootBridgeEl(tgtInst, tgtId, tgtName, macResolver, onNodeSelect));
    rootRow.append(tdRootLabel, tdRootSrc, tdRootTgt);

    const rows = connEntries
      .map(e => ({
        label: e.ifRemote && e.ifRemote !== e.ifLocal ? `${e.ifLocal} ↔ ${e.ifRemote}` : e.ifLocal,
        srcStp: findStpInterface(srcInfo?.stp, e.ifLocal, selectedKey),
        tgtStp: findStpInterface(tgtInfo?.stp, e.ifRemote, selectedKey),
      }))
      .filter(r => r.srcStp ?? r.tgtStp)
      .map(r => {
        const tr = document.createElement('tr');
        const tdL = document.createElement('td');
        tdL.className = 'td-left';
        tdL.textContent = r.label;
        tr.append(tdL, makeStpCell(r.srcStp), makeStpCell(r.tgtStp));
        return tr;
      });

    tableContainer.append(buildPaginatedTable(tableHeaders, [rootRow, ...rows]));
  }

  renderTable();

  return { content: wrapper, disabled: false };
}
