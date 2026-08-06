import type cytoscape from 'cytoscape';
import type { ExpandCollapseController } from '../expand-collapse.ts';
import type { HierarchyLevel, AnyTypedNode } from '../node-factory.ts';
import type { DeviceInfoOutput } from '../generated/types.gen.ts';

export function setupToolbar(
  ctrl: ExpandCollapseController,
  hierarchy: HierarchyLevel[],
  initialLevel: string | 'all' | 'none' = 'none',
): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const levels: Array<{ value: string; text: string }> = [
    { value: 'none', text: 'None' },
    ...hierarchy.map(h => ({ value: h.label, text: h.label.charAt(0).toUpperCase() + h.label.slice(1) })),
    { value: 'all', text: 'All' },
  ];

  const group = document.createElement('div');
  group.className = 'toolbar-level-group';

  const buttons = levels.map(({ value, text }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toolbar-toggle';
    btn.textContent = text;
    btn.title = `Expand all nodes down to the "${text}" level`;
    if (value === initialLevel) btn.classList.add('active');
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ctrl.expandToLevel(value);
    });
    group.appendChild(btn);
    return btn;
  });

  el.appendChild(group);
}

export function setupCompareButton(onOpen: () => void): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-icon-btn';
  btn.title = 'Open device comparison';
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="9" height="18" rx="1"/><line x1="4.5" y1="8" x2="8.5" y2="8"/><line x1="4.5" y1="11" x2="7" y2="11"/><line x1="4.5" y1="14" x2="8.5" y2="14"/><rect x="13" y="3" width="9" height="18" rx="1"/><line x1="15.5" y1="8" x2="19.5" y2="8"/><line x1="15.5" y1="11" x2="19.5" y2="11"/><line x1="15.5" y1="14" x2="17.5" y2="14"/></svg>`;
  btn.addEventListener('click', onOpen);
  el.append(btn);
}

export function setupZoomFitButton(cy: cytoscape.Core): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const spacer = document.createElement('div');
  spacer.className = 'toolbar-spacer';
  el.append(spacer);

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
  deviceInfo?: Map<string, DeviceInfoOutput>,
): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-wrapper';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Search…';

  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown';
  dropdown.hidden = true;

  const iconEl = document.createElement('span');
  iconEl.className = 'search-input-icon';
  iconEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>`;

  const enterHint = document.createElement('kbd');
  enterHint.className = 'search-enter-hint';
  enterHint.textContent = '↵';

  wrapper.append(iconEl, input, enterHint, dropdown);
  el.append(wrapper);

  // ── helpers ──────────────────────────────────────────────────────────────

  const isExact = (text: string, q: string) =>
    text.split('\n').some(line => {
      const l = line.trim();
      return l === q || l.split(': ').at(-1) === q;
    });

  function nodeText(n: AnyTypedNode): string {
    const info = deviceInfo?.get(n.data.id);
    return [
      n.data.title,
      n.data.label,
      n.data.vendor,
      n.data.node_type,
      (n.data as { device_type?: string }).device_type,
      info?.version?.vendor,
      info?.version?.model,
      info?.version?.software,
      info?.version?.serial,
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function getMatches(q: string): AnyTypedNode[] {
    if (!q) return [];
    type Scored = { node: AnyTypedNode; tier: number };
    const scored: Scored[] = [];
    for (const n of nodes) {
      if (n.data.node_type === 'group') continue;
      const text = nodeText(n);
      let tier: number;
      if (isExact(text, q))      tier = 0;
      else if (text.includes(q)) tier = 1;
      else continue;
      scored.push({ node: n, tier });
    }
    scored.sort((a, b) => a.tier - b.tier);
    return scored.map(s => s.node);
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
    enterHint.style.opacity = '0';
    dropdown.hidden = true;
    results = [];
    activeIdx = -1;
    ctrl.clearHighlights();
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
      results.slice(0, 8).forEach((n, i) => {
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

  // Applies the graph action for the current results: single match auto-selects,
  // multiple matches highlight all and fit view, no match clears.
  function applySearch() {
    ctrl.clearHighlights();
    if (results.length === 1) {
      selectNode(results[0]);
    } else if (results.length > 1) {
      ctrl.highlightNodes(results.map(n => n.data.id));
      dropdown.hidden = true;
    }
  }

  // ── events ───────────────────────────────────────────────────────────────

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    enterHint.style.opacity = q ? '1' : '0';
    renderDropdown(q);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dropdown.hidden = true; ctrl.clearHighlights(); enterHint.style.opacity = '0'; input.blur(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, Math.min(results.length, 8) - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(Math.max(activeIdx - 1, -1)); return; }
    if (e.key === 'Enter') {
      if (activeIdx >= 0) { selectNode(results[activeIdx]); return; }
      applySearch();
    }
  });

  input.addEventListener('blur', () => { setTimeout(() => { dropdown.hidden = true; }, 100); });
}
