import { getDevice, getHost } from '../generated/sdk.gen.ts';
import type { DeviceInfoOutput, HostResponse } from '../generated/types.gen.ts';
import { formatTimestamp, formatDateString, makeStatusDot, vendorBadgeUrl } from './panel/utils.ts';
import { STALE_THRESHOLD_MS } from '../network-styles.ts';

export interface CompareController {
  add: (nodeId: string, nodeType?: string) => void;
  has: (nodeId: string) => boolean;
  open: () => void;
  setLocate: (fn: (nodeId: string) => void) => void;
}

type DeviceEntry = {
  id: string;
  nodeType: string;
  loading: boolean;
  data: DeviceInfoOutput | null;
  hostData: HostResponse | null;
  error: boolean;
};

function getStatus(info: DeviceInfoOutput): 'online' | 'down' | 'unknown' {
  if (!info.known) return 'unknown';
  if (info.last_seen && Date.now() - info.last_seen * 1000 > STALE_THRESHOLD_MS) return 'down';
  return 'online';
}

function val(v: string | null | undefined): string {
  return v ?? '—';
}

export function setupComparePanel(opts?: { networkId?: number; snapshotId?: number }): CompareController {
  const entries: DeviceEntry[] = [];
  let overlay: HTMLElement | null = null;
  let locateFn: ((nodeId: string) => void) | null = null;
  const expandedSections = new Set<string>();

  function getOrCreateOverlay(): HTMLElement {
    if (overlay) return overlay;

    const el = document.createElement('div');
    el.className = 'compare-overlay';
    el.style.cssText = [
      'position:absolute', 'inset:0', 'z-index:2000',
      'background:rgba(0,0,0,0.45)',
      'display:flex', 'align-items:stretch', 'justify-content:center',
    ].join(';');
    const stage = document.getElementById('viz-wrapper') ?? document.body;
    stage.append(el);

    el.addEventListener('click', e => {
      if (e.target === el) close();
    });

    document.addEventListener('keydown', onKey);
    overlay = el;
    return el;
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') close();
  }

  function close(): void {
    overlay?.remove();
    overlay = null;
    document.removeEventListener('keydown', onKey);
  }

  function render(): void {
    const el = getOrCreateOverlay();
    el.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = [
      'background:#fff', 'display:flex', 'flex-direction:column',
      'width:100%', 'max-width:1200px', 'margin:24px',
      'border-radius:10px', 'box-shadow:0 8px 32px rgba(0,0,0,0.18)',
      'overflow:hidden',
    ].join(';');

    // ── Button row (non-scrolling, always above table content) ──────��────────
    const btnRow = document.createElement('div');
    btnRow.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:flex-end',
      'gap:8px', 'padding:6px 10px 4px', 'flex-shrink:0',
      'border-bottom:1px solid #f0f0f0',
    ].join(';');

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.style.cssText = 'font-size:0.75rem;color:#999;background:none;border:none;cursor:pointer;padding:2px 4px;font-family:inherit;';
    clearBtn.textContent = 'Clear all';
    clearBtn.addEventListener('click', () => { entries.splice(0); close(); });

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'panel-close-btn';
    closeBtn.setAttribute('aria-label', 'Close comparison');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position:static;';
    closeBtn.addEventListener('click', close);

    btnRow.append(clearBtn, closeBtn);
    panel.append(btnRow);

    // ── Table ────────────────────────────────────────────────────────────────
    const scrollWrap = document.createElement('div');
    scrollWrap.style.cssText = 'overflow:auto;flex:1;';

    const table = document.createElement('table');
    table.style.cssText = [
      'border-collapse:collapse', 'width:100%', 'font-size:0.82rem',
      'table-layout:fixed',
    ].join(';');

    const colW = Math.max(160, Math.floor(900 / Math.max(entries.length, 1)));

    // thead
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
          locateFn!(entry.id);
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
        render();
      });
      th.append(removeBtn);

      headRow.append(th);
    });

    thead.append(headRow);
    table.append(thead);

    // tbody
    const tbody = document.createElement('tbody');

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

      // ── header row ────────────────────────────────────────────────────────
      const htr = document.createElement('tr');
      htr.style.cursor = 'pointer';
      htr.addEventListener('click', () => {
        if (expandedSections.has(key)) expandedSections.delete(key);
        else expandedSections.add(key);
        render();
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

      // ── data rows: union of all keys across all devices ───────────────────
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

    const devs = entries.map(e => e.data);
    const hosts = entries.map(e => e.hostData);

    sectionRow('Identity');
    row('IP Address',  entries.map(e => e.data?.ip_address ?? e.hostData?.data.addresses?.[0]?.ipv4 ?? null));
    row('Type',        entries.map(e => e.nodeType));
    row('Vendor',      entries.map(e => val(e.data?.version?.vendor)));
    row('Model',       entries.map(e => val(e.data?.version?.model)));
    row('Firmware',    entries.map(e => val(e.data?.version?.software)));
    row('MAC',         entries.map(e => val(e.data?.mac?.address ?? (e.hostData as unknown as Record<string, string> | null)?.['mac'])));
    row('Serial',      entries.map(e => val(e.data?.version?.serial)));
    row('First Seen',  entries.map(e => val(formatDateString(e.data ? (e.data as unknown as Record<string, string>)['created'] : null))));
    row('Last Seen',   entries.map(e => val(formatTimestamp(e.data?.last_seen))));

    const anyDevData = devs.some(Boolean);
    if (anyDevData) {
      sectionRow('Interfaces');
      accordionSection(
        'ports', 'Ports',
        d => Object.values(d.ports ?? {}),
        p => p.if_no,
        p => p ? [`${p.if_state ?? '?'} · ${p.port_type ?? '—'} · VLAN ${p.vlan_id ?? '—'}`] : [],
      );
      accordionSection(
        'lags', 'LAGs',
        d => Object.values(d.lags ?? {}),
        l => l.name,
        l => l ? [`${l.protocol ?? '—'} · ${Object.values(l.members).map(m => m.if_no).join(', ') || '—'}`] : [],
      );
      accordionSection(
        'neighbors', 'Neighbors',
        d => Object.values(d.neighbors ?? {}),
        n => n.name || n.ip_address || n.neigh_id,
        n => n ? [n.ip_address ?? '—'] : [],
      );

      sectionRow('Network');
      accordionSection(
        'vlans', 'VLANs',
        d => Object.values(d.vlans ?? {}),
        v => String(v.vlan_id),
        v => v ? [v.vlan_name ?? '—'] : [],
      );
      accordionSection(
        'vrfs', 'VRFs',
        d => Object.values(d.vrfs ?? {}),
        v => v.vrf_name,
        v => v ? [v.route_distinguisher ?? '—'] : [],
      );
      accordionSection(
        'routes', 'Routes',
        d => Object.values(d.routes ?? {}),
        r => `${r.network}/${r.mask ?? ''}`,
        r => r ? [`${r.protocol ?? '—'} · ${r.nexthop_ip || r.nexthop_if || '—'}`] : [],
      );
      accordionSection(
        'ipconfigs', 'IP Configs',
        d => Object.values(d.ip_configs ?? {}),
        c => c.interface_name,
        c => c ? [`${(c.ip_interfaces ?? []).join(', ') || '—'} · ${c.vrf || '—'}`] : [],
      );
    }

    void hosts; // host data currently only contributes IP/name above

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = [
        'flex:1', 'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'padding:48px 24px', 'color:#aaa', 'font-size:0.85rem', 'text-align:center',
      ].join(';');
      empty.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:12px"><rect x="2" y="3" width="9" height="18" rx="1"/><line x1="4.5" y1="8" x2="8.5" y2="8"/><line x1="4.5" y1="11" x2="7" y2="11"/><line x1="4.5" y1="14" x2="8.5" y2="14"/><rect x="13" y="3" width="9" height="18" rx="1"/><line x1="15.5" y1="8" x2="19.5" y2="8"/><line x1="15.5" y1="11" x2="19.5" y2="11"/><line x1="15.5" y1="14" x2="17.5" y2="14"/></svg><span>No devices added yet.<br>Right-click a device and choose <strong style="color:#888">Add to comparison</strong>.</span>`;
      panel.append(empty);
    } else {
      table.append(tbody);
      scrollWrap.append(table);
      panel.append(scrollWrap);
    }
    el.append(panel);
  }

  async function fetchAndRender(entry: DeviceEntry): Promise<void> {
    const query = { explorer_network_id: opts?.networkId, snapshot_id: opts?.snapshotId };
    try {
      if (entry.nodeType === 'host') {
        const { data, error } = await getHost({ path: { host_id: entry.id }, query });
        entry.loading = false;
        if (error || !data?.data) { entry.error = true; }
        else { entry.hostData = data.data; }
      } else {
        const { data, error } = await getDevice({ path: { device_id: entry.id }, query });
        entry.loading = false;
        if (error || !data?.data?.data) { entry.error = true; }
        else { entry.data = data.data.data; }
      }
    } catch {
      entry.loading = false;
      entry.error = true;
    }
    if (overlay) render();
  }

  return {
    has(nodeId: string): boolean {
      return entries.some(e => e.id === nodeId);
    },
    open(): void {
      render();
    },
    setLocate(fn: (nodeId: string) => void): void {
      locateFn = fn;
    },
    add(nodeId: string, nodeType = 'device'): void {
      const existing = entries.findIndex(e => e.id === nodeId);
      if (existing !== -1) {
        entries.splice(existing, 1);
        if (entries.length === 0) { close(); return; }
        render();
        return;
      }

      const entry: DeviceEntry = { id: nodeId, nodeType, loading: true, data: null, hostData: null, error: false };
      entries.push(entry);
      render();
      void fetchAndRender(entry);
    },
  };
}
