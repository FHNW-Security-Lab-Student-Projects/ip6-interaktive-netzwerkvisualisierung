import { getDevice, getHost } from '../generated/sdk.gen.ts';
import type { DeviceInfoOutput, HostResponse } from '../generated/types.gen.ts';
import { formatTimestamp, formatDateString, makeStatusDot, vendorBadgeUrl } from './panel/utils.ts';
import { STALE_THRESHOLD_MS } from '../network-styles.ts';

export interface CompareController {
  add: (nodeId: string, nodeType?: string) => void;
  has: (nodeId: string) => boolean;
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

  function getOrCreateOverlay(): HTMLElement {
    if (overlay) return overlay;

    const el = document.createElement('div');
    el.className = 'compare-overlay';
    el.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2000',
      'background:rgba(0,0,0,0.45)',
      'display:flex', 'align-items:stretch', 'justify-content:center',
    ].join(';');
    document.body.append(el);

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

    // ── Header bar ──────────────────────────────────────────────────────────
    const bar = document.createElement('div');
    bar.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:space-between',
      'padding:14px 20px', 'border-bottom:1px solid #e8eaed',
      'background:#f8f9fb', 'flex-shrink:0',
    ].join(';');

    const title = document.createElement('span');
    title.style.cssText = 'font-size:0.95rem;font-weight:700;color:#1a1a2e;';
    title.textContent = `Device Comparison (${entries.length})`;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'panel-close-btn';
    closeBtn.setAttribute('aria-label', 'Close comparison');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', close);

    bar.append(title, closeBtn);
    panel.append(bar);

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
      nameRow.style.cssText = 'display:flex;align-items:center;gap:6px;';

      if (!entry.loading && !entry.error && entry.data) {
        const dot = makeStatusDot(getStatus(entry.data));
        nameRow.append(dot);
      }

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-weight:700;color:#1a1a2e;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      nameSpan.textContent = entry.loading ? 'Loading…' : entry.error ? entry.id : (entry.data?.name ?? entry.hostData?.data.hw_id ?? entry.id);
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
      row('Ports',     devs.map(d => d?.ports?.length != null ? String(d.ports.length) : '—'));
      row('LAGs',      devs.map(d => d?.lags?.length != null ? String(d.lags.length) : '—'));
      row('Neighbors', devs.map(d => d?.neighbors?.length != null ? String(d.neighbors.length) : '—'));

      sectionRow('Network');
      row('VLANs',    devs.map(d => d?.vlans?.length != null ? String(d.vlans.length) : '—'));
      row('VRFs',     devs.map(d => d?.vrfs?.length != null ? String(d.vrfs.length) : '—'));
      row('Routes',   devs.map(d => d?.routes?.length != null ? String(d.routes.length) : '—'));
      row('IP Configs', devs.map(d => d?.ip_configs?.length != null ? String(d.ip_configs.length) : '—'));
    }

    void hosts; // host data currently only contributes IP/name above

    table.append(tbody);
    scrollWrap.append(table);
    panel.append(scrollWrap);
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
