import type cytoscape from 'cytoscape';
import type { ExpandCollapseController } from '../expand-collapse.ts';
import type { HierarchyLevel, AnyTypedNode } from '../node-factory.ts';

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
