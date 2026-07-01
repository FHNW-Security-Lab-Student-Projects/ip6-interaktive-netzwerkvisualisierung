import type { DeviceInfoOutput, SpanningTreeInterface, SpanningTreeInstanceOutput } from '../../../generated/types.gen.ts';
import type { PanelSection } from '../types.ts';
import { buildPaginatedTable } from '../table.ts';
import { buildStpControls, makeRootBridgeEl, type StpEntry } from '../stp-shared.ts';

export function buildSpanningTreeSection(
  info: DeviceInfoOutput,
  defaultInstanceKey?: string | null,
  macResolver?: (mac: string) => { id: string; name: string } | null,
  onNodeSelect?: (id: string) => void,
): PanelSection {
  if (!info.stp?.instances) {
    return { label: 'Spanning Tree', content: emptyEl(), disabled: true };
  }

  const entries: StpEntry[] = Object.entries(info.stp.instances)
    .map(([key, inst]) => ({
      key,
      label: inst.mapped_vlans ? `${key} (${inst.mapped_vlans})` : key,
      protocol: info.stp!.protocol,
    }))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));

  if (entries.length === 0) {
    return { label: 'Spanning Tree', content: emptyEl(), disabled: true };
  }

  const wrapper = document.createElement('div');
  const contentContainer = document.createElement('div');

  const { el: headerEl, initialKey } = buildStpControls(entries, defaultInstanceKey ?? null, key => {
    selectedKey = key;
    renderContent();
  });
  let selectedKey: string | null = initialKey;

  wrapper.append(headerEl, contentContainer);

  function renderContent() {
    contentContainer.innerHTML = '';
    if (!selectedKey) {
      contentContainer.append(noneEl());
      return;
    }
    const inst = info.stp!.instances![selectedKey];
    if (!inst) {
      contentContainer.append(emptyEl());
      return;
    }
    contentContainer.append(buildInstanceSummary(inst, info, macResolver, onNodeSelect), buildInterfaceTable(inst.interfaces ?? []));
  }

  renderContent();
  return { label: 'Spanning Tree', content: wrapper, disabled: false };
}

function emptyEl(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'section-empty';
  el.textContent = 'No spanning tree data available.';
  return el;
}

function noneEl(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'section-empty';
  el.textContent = 'Select an instance to view STP details.';
  return el;
}

function buildInstanceSummary(
  inst: SpanningTreeInstanceOutput,
  info: DeviceInfoOutput,
  macResolver?: (mac: string) => { id: string; name: string } | null,
  onNodeSelect?: (id: string) => void,
): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'info-grid';
  const add = (label: string, value: string) => {
    const cell = document.createElement('div');
    cell.className = 'info-cell';
    const lbl = document.createElement('span');
    lbl.className = 'info-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'info-value';
    val.textContent = value;
    cell.append(lbl, val);
    grid.append(cell);
  };
  const addEl = (label: string, el: HTMLElement) => {
    const cell = document.createElement('div');
    cell.className = 'info-cell';
    const lbl = document.createElement('span');
    lbl.className = 'info-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'info-value';
    val.append(el);
    cell.append(lbl, val);
    grid.append(cell);
  };
  add('VLANs', inst.mapped_vlans || '—');
  add('Root', inst.is_root ? 'Yes' : 'No');
  addEl('Root Bridge', makeRootBridgeEl(inst, info.id, info.name, macResolver, onNodeSelect));
  add('Root Port', inst.root_port ?? inst.root_port_short ?? '—');
  add('Bridge Priority', inst.bridge_priority != null ? String(inst.bridge_priority) : '—');
  add('Root Priority', String(inst.root_priority));
  return grid;
}

function buildInterfaceTable(interfaces: SpanningTreeInterface[]): HTMLElement {
  if (interfaces.length === 0) {
    const el = document.createElement('div');
    el.className = 'section-empty';
    el.textContent = 'No interface STP data.';
    return el;
  }
  const rows = interfaces.map(iface => {
    const tr = document.createElement('tr');

    const tdIf = document.createElement('td');
    tdIf.className = 'td-left';
    tdIf.textContent = iface.if_no_short || iface.if_no || '—';

    const tdRole = document.createElement('td');
    tdRole.textContent = iface.role ?? '—';

    const tdState = document.createElement('td');
    if (iface.state === 'Blocking') tdState.className = 'stp-blocking';
    tdState.textContent = iface.state;

    const tdCost = document.createElement('td');
    tdCost.textContent = iface.cost || '—';

    const tdPri = document.createElement('td');
    tdPri.textContent = String(iface.priority);

    tr.append(tdIf, tdRole, tdState, tdCost, tdPri);
    return tr;
  });
  return buildPaginatedTable(['Interface', 'Role', 'State', 'Cost', 'Priority'], rows);
}
