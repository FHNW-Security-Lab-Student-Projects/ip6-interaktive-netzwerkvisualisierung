import type cytoscape from 'cytoscape';
import type { ExpandCollapseController } from '../expand-collapse.ts';
import type { HierarchyLevel, AnyTypedNode } from '../node-factory.ts';
import { getIconData, iconToSVG } from '@iconify/utils';
import { icons as carbonIcons } from '@iconify-json/carbon';
import { Colors, lighten } from '../network-styles.ts';

export function setupToolbar(
  ctrl: ExpandCollapseController,
  hierarchy: HierarchyLevel[],
  initialLevel: string | 'all' | 'none' = 'none',
): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const label = document.createElement('span');
  label.className = 'toolbar-label';
  label.textContent = 'Expand to level';

  const select = document.createElement('select');
  const opts: Array<{ value: string; text: string }> = [
    { value: 'none', text: 'None' },
    ...hierarchy.map(h => ({ value: h.label, text: h.label.charAt(0).toUpperCase() + h.label.slice(1) })),
    { value: 'all', text: 'All' },
  ];
  opts.forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    if (value === initialLevel) opt.selected = true;
    select.appendChild(opt);
  });

  select.title = 'Expand all nodes down to the selected hierarchy level';
  select.addEventListener('change', () => ctrl.expandToLevel(select.value));

  el.appendChild(label);
  el.appendChild(select);
}

export function setupZoomFitButton(cy: cytoscape.Core): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-icon-btn';
  btn.title = 'Zoom to fit — fit all nodes into view';
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  btn.addEventListener('click', () => cy.fit(undefined, 40));
  el.append(btn);
}

export function setupSearch(
  ctrl: ExpandCollapseController,
  nodes: AnyTypedNode[],
): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-wrapper';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Hostname, IP or serial…';

  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown';
  dropdown.hidden = true;

  const iconEl = document.createElement('span');
  iconEl.className = 'search-input-icon';
  iconEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>`;

  wrapper.append(iconEl, input, dropdown);
  el.append(wrapper);

  // ── helpers ──────────────────────────────────────────────────────────────

  const isExactMatch = (s: string | undefined, q: string) =>
    s?.toLowerCase().split('\n').some(line => {
      const l = line.trim();
      return l === q || l.split(': ').at(-1) === q;
    }) ?? false;

  function getMatches(q: string): AnyTypedNode[] {
    if (!q) return [];
    const eligible = nodes.filter(n => {
      if (n.data.node_type === 'group') return false;
      return (
        n.data.title?.toLowerCase().includes(q) ||
        n.data.label?.toLowerCase().includes(q)
      );
    });
    const exact = eligible.filter(n => isExactMatch(n.data.label, q) || isExactMatch(n.data.title, q));
    const rest  = eligible.filter(n => !exact.includes(n));
    return [...exact, ...rest].slice(0, 8);
  }

  function getDisplayInfo(n: AnyTypedNode): { name: string; meta: string } {
    const lines = n.data.label?.split('\n') ?? [];
    const name  = lines[0] ?? n.data.id;
    const ip    = lines[1] ?? '';
    const type  = n.data.node_type === 'device'
      ? ((n.data as { device_type?: string }).device_type ?? 'device')
      : n.data.node_type;
    return { name, meta: [type, ip].filter(Boolean).join(' · ') };
  }

  // ── state ────────────────────────────────────────────────────────────────

  let results: AnyTypedNode[] = [];
  let activeIdx = -1;

  function setActive(idx: number) {
    activeIdx = idx;
    dropdown.querySelectorAll<HTMLElement>('.search-dropdown-item').forEach((item, i) => {
      item.classList.toggle('active', i === idx);
      if (i === idx) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function selectNode(n: AnyTypedNode) {
    input.value = '';
    dropdown.hidden = true;
    results = [];
    activeIdx = -1;
    ctrl.focusNode(n.data.id);
  }

  function renderDropdown(q: string) {
    results   = getMatches(q);
    activeIdx = -1;
    dropdown.innerHTML = '';

    if (!q) { dropdown.hidden = true; return; }

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-dropdown-empty';
      empty.textContent = 'No results';
      dropdown.appendChild(empty);
    } else {
      results.forEach((n, i) => {
        const { name, meta } = getDisplayInfo(n);
        const item = document.createElement('div');
        item.className = 'search-dropdown-item';
        item.dataset['idx'] = String(i);

        const nameEl = document.createElement('span');
        nameEl.className = 'search-dropdown-name';
        nameEl.textContent = name;

        const metaEl = document.createElement('span');
        metaEl.className = 'search-dropdown-meta';
        metaEl.textContent = meta;

        item.appendChild(nameEl);
        item.appendChild(metaEl);
        item.addEventListener('mousedown', e => { e.preventDefault(); selectNode(n); });
        dropdown.appendChild(item);
      });
    }

    dropdown.hidden = false;
  }

  // ── events ───────────────────────────────────────────────────────────────

  input.addEventListener('input', () => renderDropdown(input.value.trim().toLowerCase()));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dropdown.hidden = true; input.blur(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, results.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(activeIdx - 1, -1)); return; }
    if (e.key === 'Enter') {
      const target = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (target) selectNode(target);
    }
  });

  input.addEventListener('blur', () => { setTimeout(() => { dropdown.hidden = true; }, 100); });
}

export function setupLegend(): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  // ── helpers ──────────────────────────────────────────────────────────────

  function carbonSvg(name: string, color = '#fff', size = 11): string {
    const data = getIconData(carbonIcons, name);
    if (!data) return '';
    const { attributes, body } = iconToSVG(data, { height: 'auto' });
    const vb = (attributes as Record<string, string>).viewBox ?? '0 0 32 32';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}">${body.replace(/currentColor/g, color)}</svg>`;
  }

  // svgShape: the full SVG element string, e.g. 'polygon points="..."'
  function nodeRow(label: string, color: string, icon: string, svgShape: string): string {
    return `<div style="display:flex;align-items:center;gap:7px;padding:3px 10px;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:22px;flex-shrink:0;position:relative;">
        <svg width="26" height="22" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;"><${svgShape} fill="${color}"/></svg>
        <span style="position:relative;z-index:1;">${carbonSvg(icon)}</span>
      </span>
      <span style="font-size:0.8rem;color:#222;">${label}</span>
    </div>`;
  }

  function edgeRow(label: string, edgeSvg: string): string {
    return `<div style="display:flex;align-items:center;gap:7px;padding:3px 10px;">
      <span style="display:inline-flex;align-items:center;flex-shrink:0;">${edgeSvg}</span>
      <span style="font-size:0.8rem;color:#222;">${label}</span>
    </div>`;
  }

  function stateRow(label: string, color: string): string {
    return `<div style="display:flex;align-items:center;gap:7px;padding:3px 10px;">
      <span style="display:inline-flex;width:14px;height:14px;border-radius:50%;background:${lighten(color, 0.65)};border:2px solid ${color};flex-shrink:0;"></span>
      <span style="font-size:0.8rem;color:#222;">${label}</span>
    </div>`;
  }

  function colHeader(title: string): string {
    return `<div style="padding:6px 10px 3px;font-size:0.68rem;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.07em;">${title}</div>`;
  }

  function mkLine(color: string, dashArray = '', strokeWidth = 2, arrow = false): string {
    const w = 34; const h = 10; const mid = h / 2;
    const dash = dashArray ? ` stroke-dasharray="${dashArray}"` : '';
    let paths = `<line x1="1" y1="${mid}" x2="${w - 1}" y2="${mid}" stroke="${color}" stroke-width="${strokeWidth}"${dash}/>`;
    if (arrow) paths += `<polyline points="${w - 6},${mid - 3} ${w - 1},${mid} ${w - 6},${mid + 3}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
    return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
  }

  const C = Colors;
  const colStyle = 'display:flex;flex-direction:column;padding-bottom:6px;';
  const divStyle = 'border-right:1px solid #eee;';

  const html = `<div style="display:flex;align-items:flex-start;">
    <div style="${colStyle}${divStyle}">
      ${colHeader('Node Types')}
      ${nodeRow('Router',  C.ROUTER,  'router',         'polygon points="13,1 25,7 25,15 13,21 1,15 1,7"')}
      ${nodeRow('Switch',  C.SWITCH,  'switch-layer-2', 'rect x="1" y="5" width="24" height="12" rx="2"')}
      ${nodeRow('Host',    C.HOST,    'laptop',         'ellipse cx="13" cy="11" rx="12" ry="11"')}
      ${nodeRow('Custom',  C.CUSTOM,  'lightning',      'polygon points="13,1 25,11 13,21 1,11"')}
      ${nodeRow('Unknown', C.UNKNOWN, 'help',           'ellipse cx="13" cy="11" rx="12" ry="11"')}
    </div>
    <div style="${colStyle}${divStyle}">
      ${colHeader('Edge Types')}
      ${edgeRow('Physical', mkLine(C.EDGE))}
      ${edgeRow('LAG',      mkLine(C.EDGE, '', 4))}
      ${edgeRow('Logical',  mkLine(C.EDGE, '5,3'))}
      ${edgeRow('Uplink',   mkLine(C.STATE_HIGHLIGHT, '5,3'))}
      ${edgeRow('Routed',   mkLine(C.ROUTER, '', 2, true))}
    </div>
    <div style="${colStyle}">
      ${colHeader('States')}
      ${stateRow('Warning',   C.STATE_WARNING)}
      ${stateRow('Down',      C.STATE_DOWN)}
      ${stateRow('Disabled',  C.STATE_DISABLED)}
      ${stateRow('Highlight', C.STATE_HIGHLIGHT)}
      ${stateRow('Selected',  C.SELECTED)}
    </div>
  </div>`;

  // ── button ───────────────────────────────────────────────────────────────

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-icon-btn';
  btn.title = 'Legend';
  btn.style.cssText = 'font-weight:700;font-size:13px;';
  btn.textContent = '?';
  el.append(btn);

  let panel: HTMLElement | null = null;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (panel) { panel.remove(); panel = null; return; }

    const p = document.createElement('div');
    p.className = 'ctx-menu';
    p.style.cssText = 'position:fixed;';
    p.innerHTML = html;
    panel = p;
    document.body.append(p);

    const rect = btn.getBoundingClientRect();
    const left = Math.max(4, Math.min(rect.right - p.offsetWidth, window.innerWidth - p.offsetWidth - 4));
    p.style.left = `${left}px`;
    p.style.top  = `${rect.bottom + 6}px`;

    const onKey  = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cleanup(); };
    const onDown = (ev: MouseEvent)    => { if (!p.contains(ev.target as Node) && ev.target !== btn) cleanup(); };
    function cleanup() { p.remove(); panel = null; document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
  });
}
