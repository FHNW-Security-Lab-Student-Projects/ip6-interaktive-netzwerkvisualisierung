import type { DeviceInfoOutput } from '../../generated/types.gen.ts';
import { makeStatusDot, vendorBadgeUrl } from '../panel/utils.ts';
import { type DeviceEntry, getStatus } from './types.ts';

interface HeadRowContext {
  locateFn: ((nodeId: string) => void) | null;
  close: () => void;
  colW: number;
  rerender: () => void;
}

// Builds the <thead> with one column per device: status dot, name (optionally a
// jump-to-node link), vendor badge, and a Remove button.
export function buildHeadRow(entries: DeviceEntry[], ctx: HeadRowContext): HTMLTableSectionElement {
  const { locateFn, close, colW, rerender } = ctx;

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  const labelTh = document.createElement('th');
  labelTh.style.cssText = [
    'width:130px', 'min-width:100px', 'padding:10px 14px',
    'background:#f8f9fb', 'text-align:left', 'font-size:0.72rem',
    'font-weight:700', 'color:#888', 'text-transform:uppercase',
    'letter-spacing:0.06em', 'border-bottom:2px solid #e8eaed',
    'position:sticky', 'left:0', 'z-index:2',
  ].join(';');
  headRow.append(labelTh);

  entries.forEach((entry, i) => {
    const th = document.createElement('th');
    th.style.cssText = [
      `width:${colW}px`, `min-width:${colW}px`,
      'padding:10px 14px 8px', 'text-align:left',
      'border-bottom:2px solid #e8eaed', 'border-left:1px solid #eee',
      'background:#f8f9fb', 'vertical-align:top',
    ].join(';');

    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;';

    if (!entry.loading && !entry.error && entry.data) {
      const dot = makeStatusDot(getStatus(entry.data));
      nameRow.append(dot);
    }

    const nameSpan = document.createElement('span');
    const displayName = entry.loading ? 'Loading…' : entry.error ? entry.id : (entry.data?.name ?? entry.hostData?.data.hw_id ?? entry.id);
    nameSpan.textContent = displayName;
    if (!entry.loading && !entry.error && locateFn) {
      nameSpan.style.cssText = 'font-weight:700;color:#1a5cff;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;text-decoration:underline;text-underline-offset:2px;min-width:0;flex:1;';
      nameSpan.title = 'Jump to node in graph';
      nameSpan.addEventListener('click', () => {
        close();
        locateFn(entry.id);
      });
    } else {
      nameSpan.style.cssText = 'font-weight:700;color:#1a1a2e;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1;';
    }
    nameRow.append(nameSpan);

    if (!entry.loading && !entry.error && entry.data?.version?.vendor) {
      const badgeUrl = vendorBadgeUrl(entry.data.version.vendor);
      if (badgeUrl) {
        const img = document.createElement('img');
        img.src = badgeUrl;
        img.alt = entry.data.version.vendor;
        img.style.cssText = 'width:18px;height:18px;object-fit:contain;flex-shrink:0;';
        nameRow.append(img);
      }
    }

    th.append(nameRow);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.style.cssText = [
      'margin-top:4px', 'font-size:0.72rem', 'color:#999', 'background:none',
      'border:none', 'cursor:pointer', 'padding:0', 'font-family:inherit',
    ].join(';');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      entries.splice(i, 1);
      if (entries.length === 0) { close(); return; }
      rerender();
    });
    th.append(removeBtn);

    headRow.append(th);
  });

  thead.append(headRow);
  return thead;
}

interface TableBuilderContext {
  entries: DeviceEntry[];
  expandedSections: Set<string>;
  tbody: HTMLTableSectionElement;
  rerender: () => void;
}

export interface TableBuilders {
  row: (label: string, values: (string | HTMLElement | null)[]) => void;
  sectionRow: (label: string) => void;
  accordionSection: <T>(
    key: string,
    label: string,
    getItems: (d: DeviceInfoOutput) => T[],
    getKey: (item: T) => string,
    getVals: (item: T | undefined) => string[],
  ) => void;
}

// Row-building primitives bound to a single render pass. Difference-aware rows are
// highlighted; accordion sections expand into a per-item cross-device mini-table.
export function createTableBuilders(ctx: TableBuilderContext): TableBuilders {
  const { entries, expandedSections, tbody, rerender } = ctx;

  function row(label: string, values: (string | HTMLElement | null)[]): void {
    const strs = values.map(v => (v instanceof HTMLElement ? v.textContent ?? '' : v ?? '—'));
    const allSame = strs.every(s => s === strs[0]);

    const tr = document.createElement('tr');
    if (!allSame) tr.style.background = '#fffbeb';

    tr.addEventListener('mouseenter', () => {
      if (!allSame) tr.style.background = '#fff3cd';
      else tr.style.background = '#f6f8fa';
    });
    tr.addEventListener('mouseleave', () => {
      tr.style.background = allSame ? '' : '#fffbeb';
    });

    const lbl = document.createElement('td');
    lbl.style.cssText = [
      'padding:7px 14px', 'font-weight:600', 'color:#666', 'font-size:0.78rem',
      'white-space:nowrap', 'background:inherit',
      'position:sticky', 'left:0', 'background:#fff',
      'border-bottom:1px solid #f0f0f0',
    ].join(';');
    if (!allSame) lbl.style.background = '#fffbeb';
    lbl.textContent = label;
    tr.append(lbl);

    values.forEach(v => {
      const td = document.createElement('td');
      td.style.cssText = [
        'padding:7px 14px', 'color:#222', 'border-left:1px solid #eee',
        'border-bottom:1px solid #f0f0f0', 'max-width:0',
        'overflow:hidden', 'text-overflow:ellipsis', 'white-space:nowrap',
      ].join(';');
      if (v instanceof HTMLElement) {
        td.append(v);
      } else {
        td.textContent = v ?? '—';
        td.title = v ?? '';
      }
      tr.append(td);
    });

    tbody.append(tr);
  }

  function sectionRow(label: string): void {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', String(entries.length + 1));
    td.style.cssText = [
      'padding:6px 14px 4px', 'font-size:0.69rem', 'font-weight:700',
      'color:#aaa', 'text-transform:uppercase', 'letter-spacing:0.07em',
      'background:#f8f9fb', 'border-bottom:1px solid #eee',
    ].join(';');
    td.textContent = label;
    tr.append(td);
    tbody.append(tr);
  }

  // Accordion section: shows count per device, expands to a per-item cross-device mini-table.
  // `getItems` returns per-device item lists; `getKey` extracts the merge key; `cols` are
  // sub-column headers; `getVals` returns cell values for a given item (or null if missing).
  function accordionSection<T>(
    key: string,
    label: string,
    getItems: (d: DeviceInfoOutput) => T[],
    getKey: (item: T) => string,
    getVals: (item: T | undefined) => string[],
  ): void {
    const perDev = entries.map(e => (e.data ? getItems(e.data) : []));
    const counts = perDev.map(items => items.length);
    const isOpen = expandedSections.has(key);

    const htr = document.createElement('tr');
    htr.style.cursor = 'pointer';
    htr.addEventListener('click', () => {
      if (expandedSections.has(key)) expandedSections.delete(key);
      else expandedSections.add(key);
      rerender();
    });

    const lbl = document.createElement('td');
    lbl.style.cssText = [
      'padding:7px 14px', 'font-weight:600', 'color:#444', 'font-size:0.78rem',
      'white-space:nowrap', 'position:sticky', 'left:0', 'background:#f8f9fb',
      'border-bottom:1px solid #eee', 'user-select:none',
    ].join(';');
    lbl.textContent = `${isOpen ? '▾' : '▸'} ${label}`;
    htr.append(lbl);

    const allSameCount = counts.every(c => c === counts[0]);
    counts.forEach(c => {
      const td = document.createElement('td');
      td.style.cssText = [
        'padding:7px 14px', 'border-left:1px solid #eee', 'border-bottom:1px solid #eee',
        'font-size:0.78rem', 'color:#444', 'background:#f8f9fb',
      ].join(';');
      if (!allSameCount) td.style.background = '#fffbeb';
      td.textContent = c > 0 ? String(c) : '—';
      htr.append(td);
    });
    tbody.append(htr);

    if (!isOpen) return;

    const allKeys = [...new Set(perDev.flatMap(items => items.map(getKey)))];
    allKeys.forEach(itemKey => {
      const byDev = perDev.map(items => items.find(it => getKey(it) === itemKey));
      const valsByDev = byDev.map(it => getVals(it));
      // compare all values concatenated to detect differences
      const flatVals = valsByDev.map(vs => vs.join('\0'));
      const allSame = flatVals.every(v => v === flatVals[0]);

      const dtr = document.createElement('tr');
      if (!allSame) dtr.style.background = '#fffbeb';
      dtr.addEventListener('mouseenter', () => { dtr.style.background = allSame ? '#f6f8fa' : '#fff3cd'; });
      dtr.addEventListener('mouseleave', () => { dtr.style.background = allSame ? '' : '#fffbeb'; });

      const keyTd = document.createElement('td');
      keyTd.style.cssText = [
        'padding:5px 14px 5px 28px', 'font-size:0.78rem', 'color:#666',
        'white-space:nowrap', 'position:sticky', 'left:0',
        'background:inherit', 'border-bottom:1px solid #f4f4f4',
      ].join(';');
      if (!allSame) keyTd.style.background = '#fffbeb';
      keyTd.textContent = itemKey;
      dtr.append(keyTd);

      valsByDev.forEach(vs => {
        const td = document.createElement('td');
        td.style.cssText = [
          'padding:5px 14px', 'font-size:0.78rem', 'color:#333',
          'border-left:1px solid #eee', 'border-bottom:1px solid #f4f4f4',
          'max-width:0', 'overflow:hidden', 'text-overflow:ellipsis', 'white-space:nowrap',
        ].join(';');
        const text = vs.filter(Boolean).join(' · ') || '—';
        td.textContent = text;
        td.title = text;
        dtr.append(td);
      });

      tbody.append(dtr);
    });
  }

  return { row, sectionRow, accordionSection };
}
