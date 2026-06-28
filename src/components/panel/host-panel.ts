import type { HostResponse } from '../../generated/types.gen.ts';
import { makeCopyable, makeChip, makeStatusDot, formatTimestamp, formatDateString } from './utils.ts';
import { makeNodeName } from './utils.ts';

export function buildHostPanelEl(
  host: HostResponse,
  context?: { nodeType?: string },
  onNodeSelect?: (id: string) => void,
): HTMLElement {
  const info = host.data;
  const wrapper = document.createElement('div');

  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';

  const heroRow = document.createElement('div');
  heroRow.className = 'panel-hero-row';

  // HostInfoOutput has no "known" equivalent, so hosts always show the neutral grey dot.
  heroRow.append(makeStatusDot('unknown'));

  const nameEl = document.createElement('span');
  nameEl.className = 'panel-device-name';
  const displayName = info.addresses?.[0]?.ipv4 ?? info.mac?.address ?? info.hw_id ?? 'Unknown Host';
  nameEl.textContent = displayName;
  makeCopyable(nameEl, displayName);
  heroRow.append(nameEl);
  header.append(heroRow);

  // Chips
  const chips = document.createElement('div');
  chips.className = 'panel-chips-row';
  const addChip = (text: string) => {
    const chip = makeChip(text);
    makeCopyable(chip, text);
    chips.append(chip);
  };
  if (context?.nodeType) addChip(context.nodeType);
  if (info.vendor) addChip(info.vendor);
  if (chips.children.length > 0) header.append(chips);

  // Info grid
  const grid = document.createElement('div');
  grid.className = 'info-grid';

  const add = (label: string, value: string | null | undefined, copyValue?: string) => {
    const cell = document.createElement('div');
    cell.className = 'info-cell';

    const lbl = document.createElement('span');
    lbl.className = 'info-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    if (value) {
      val.className = 'info-value';
      val.textContent = value;
      makeCopyable(val, copyValue ?? value);
    } else {
      val.className = 'info-value info-null';
      val.textContent = 'N/A';
    }

    cell.append(lbl, val);
    grid.append(cell);
  };

  add('MAC', info.mac?.address ?? null);

  const ipText = info.addresses?.length
    ? info.addresses.map(a => a.ipv4).join(', ')
    : null;
  add('IP Address', ipText);

  // Seen On and Port share a row (grid is 2 columns)
  if (info.seen_on_device) {
    const cell = document.createElement('div');
    cell.className = 'info-cell';
    const lbl = document.createElement('span');
    lbl.className = 'info-label';
    lbl.textContent = 'Seen On';
    const val = document.createElement('span');
    val.className = 'info-value';
    val.append(makeNodeName(info.seen_on_device_name ?? info.seen_on_device, info.seen_on_device, onNodeSelect));
    cell.append(lbl, val);
    grid.append(cell);
  }

  add('Port', info.port_if_no_short ?? info.port_if_no ?? null);
  add('First Seen', formatDateString(host.created), host.created);
  add('Last Seen', formatTimestamp(info.last_seen), info.last_seen ? String(info.last_seen) : undefined);

  const vlanText = info.vlan_ids?.length
    ? info.vlan_ids.map(String).join(', ')
    : null;
  add('VLANs', vlanText);

  header.append(grid);
  wrapper.append(header);
  return wrapper;
}
