import type { DeviceResponse } from '../../generated/types.gen.ts';
import { makeCopyable, makeChip, makeStatusDot, formatTimestamp, formatDateString, vendorBadgeUrl } from './utils.ts';
import { STALE_THRESHOLD_MS } from '../../network-styles.ts';

export function buildHeader(device: DeviceResponse, context?: { nodeType?: string; deviceType?: string }): HTMLElement {
  const info = device.data;
  const header = document.createElement('div');
  header.className = 'panel-header';

  const heroRow = document.createElement('div');
  heroRow.className = 'panel-hero-row';

  // "known" = we can log in and collect data. "down" = known but last_seen is stale.
  const isStale = !!info.last_seen && Date.now() - info.last_seen * 1000 > STALE_THRESHOLD_MS;
  const staleHours = STALE_THRESHOLD_MS / (60 * 60 * 1000);
  const staleLabel = staleHours % 24 === 0
    ? `${staleHours / 24} day${staleHours / 24 === 1 ? '' : 's'}`
    : `${staleHours} hour${staleHours === 1 ? '' : 's'}`;
  const statusTooltip = !info.known
    ? 'Unknown – device found but could not connect to collect details'
    : isStale
      ? `Not seen in the last ${staleLabel}`
      : 'Online';
  const dot = makeStatusDot(!info.known ? 'unknown' : isStale ? 'down' : 'online', statusTooltip);

  const nameEl = document.createElement('span');
  nameEl.className = 'panel-device-name';
  const displayName = info.name || info.id || 'Unknown';
  nameEl.textContent = displayName;
  makeCopyable(nameEl, displayName);

  heroRow.append(dot, nameEl);

  const badgeUrl = info.version?.vendor ? vendorBadgeUrl(info.version.vendor) : null;
  if (badgeUrl) {
    const badge = document.createElement('img');
    badge.src = badgeUrl;
    badge.alt = info.version!.vendor!;
    badge.className = 'vendor-badge';
    heroRow.append(badge);
  }
  header.append(heroRow);

  if (info.ip_address) {
    const ipEl = document.createElement('div');
    ipEl.className = 'panel-hero-ip';
    ipEl.textContent = info.ip_address;
    makeCopyable(ipEl, info.ip_address);
    header.append(ipEl);
  }

  const chips = document.createElement('div');
  chips.className = 'panel-chips-row';
  const addChip = (label: string, value: string) => {
    const chip = makeChip(value);
    makeCopyable(chip, value);
    chip.title = `${label}: ${value}`;
    chips.append(chip);
  };
  if (context?.nodeType)      addChip('type', context.nodeType);
  if (context?.deviceType)    addChip('device', context.deviceType);
  if (info.version?.vendor)   addChip('vendor', info.version.vendor);
  if (info.version?.model)    addChip('model', info.version.model);
  if (info.version?.software) addChip('firmware', info.version.software);
  if (chips.children.length > 0) header.append(chips);

  header.append(buildInfoGrid(device));
  return header;
}

function buildInfoGrid(device: DeviceResponse): HTMLElement {
  const info = device.data;
  const grid = document.createElement('div');
  grid.className = 'info-grid';

  const add = (label: string, value: string | null | undefined, copyValue?: string, fullWidth = false) => {
    const cell = document.createElement('div');
    cell.className = fullWidth ? 'info-cell full-width' : 'info-cell';

    const lbl = document.createElement('span');
    lbl.className = 'info-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    if (value) {
      val.className = 'info-value';
      if (value.includes('\n')) {
        value.split('\n').forEach((line, i) => {
          if (i > 0) val.append(document.createElement('br'));
          val.append(document.createTextNode(line));
        });
      } else {
        val.textContent = value;
      }
      makeCopyable(val, copyValue ?? value);
    } else {
      val.className = 'info-value info-null';
      val.textContent = 'N/A';
    }

    cell.append(lbl, val);
    grid.append(cell);
  };

  add('MAC', info.mac?.address ?? null);
  add('Serial', info.version?.serial ?? null);
  add('First Seen', formatDateString(device.created), device.created);
  add('Last Seen', formatTimestamp(info.last_seen), info.last_seen ? String(info.last_seen) : undefined);

  return grid;
}
