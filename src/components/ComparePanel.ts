import { formatTimestamp, formatDateString } from './panel/utils.ts';
import { type CompareController, type DeviceEntry, val } from './compare/types.ts';
import { loadEntry } from './compare/fetch.ts';
import { buildHeadRow, createTableBuilders } from './compare/table.ts';

export type { CompareController } from './compare/types.ts';

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

    const scrollWrap = document.createElement('div');
    scrollWrap.style.cssText = 'overflow:auto;flex:1;';

    const table = document.createElement('table');
    table.style.cssText = [
      'border-collapse:collapse', 'width:100%', 'font-size:0.82rem',
      'table-layout:fixed',
    ].join(';');

    const colW = Math.max(160, Math.floor(900 / Math.max(entries.length, 1)));

    table.append(buildHeadRow(entries, { locateFn, close, colW, rerender: render }));

    const tbody = document.createElement('tbody');
    const { row, sectionRow, accordionSection } = createTableBuilders({ entries, expandedSections, tbody, rerender: render });

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
    await loadEntry(entry, opts);
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
