import type { ExpandCollapseController } from '../expand-collapse.ts';
import type { HierarchyLevel } from '../node-factory.ts';

export function setupToolbar(
  ctrl: ExpandCollapseController,
  hierarchy: HierarchyLevel[],
  initialLevel: string | 'all' | 'none' = 'none',
): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  const label = document.createElement('span');
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

  select.addEventListener('change', () => ctrl.expandToLevel(select.value));

  el.appendChild(label);
  el.appendChild(select);
}
