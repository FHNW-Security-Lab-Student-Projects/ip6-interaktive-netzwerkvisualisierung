import { getIconData, iconToSVG } from '@iconify/utils';
import { icons as simpleIcons } from '@iconify-json/simple-icons';
import type { PanelSection } from './types.ts';
import { buildPaginatedTable } from './table.ts';

export function vendorBadgeUrl(vendor: string): string | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const candidates = [normalize(vendor), normalize(vendor.split(/[\s,._]/)[0])];
  for (const name of candidates) {
    const data = getIconData(simpleIcons, name);
    if (data) {
      const { attributes, body } = iconToSVG(data, { height: 'auto' });
      const vb = (attributes as Record<string, string>).viewBox ?? '0 0 24 24';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body.replace(/currentColor/g, '#444')}</svg>`;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
  }
  return null;
}

// Generic text element: plain, copy-on-click, or navigate-on-click.
// Always sets title so full text is visible on hover (handles truncation).
export function makeTextEl(
  text: string,
  opts?: {
    navigate?: () => void;
    copy?: string;      // text to copy; omit for navigate or plain
    tooltip?: string;   // overrides title; defaults to text
    className?: string;
  },
): HTMLSpanElement {
  const el = document.createElement('span');
  el.textContent = text;
  el.title = opts?.tooltip ?? text;
  if (opts?.className) el.className = opts.className;
  if (opts?.navigate) {
    el.classList.add('text-link');
    el.addEventListener('click', opts.navigate);
  } else if (opts?.copy !== undefined) {
    makeCopyable(el, opts.copy);
  }
  return el;
}

// Node name rendered consistently across all panels.
// Always styled as a graph-device name (blue, semi-bold).
// Adds text-link behavior only when onNodeSelect is provided.
export function makeNodeName(
  name: string,
  nodeId: string,
  onNodeSelect?: (id: string) => void,
): HTMLSpanElement {
  const el = document.createElement('span');
  el.textContent = name;
  el.title = name;
  el.className = 'node-name';
  if (onNodeSelect) {
    el.classList.add('text-link');
    el.addEventListener('click', () => onNodeSelect(nodeId));
  }
  return el;
}

export function makeCopyable(el: HTMLElement, text: string): void {
  el.classList.add('copyable');
  el.title = text;
  el.addEventListener('click', async e => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); } catch { return; }
    const me = e as MouseEvent;
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = 'Copied!';
    toast.style.left = `${me.clientX}px`;
    toast.style.top = `${me.clientY - 36}px`;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 1100);
  });
}

export function makeChip(text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'chip';
  el.textContent = text;
  el.title = text;
  return el;
}

export function formatTimestamp(ts: number | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return `${d.toISOString().slice(0, 10)}\n${d.toISOString().slice(11, 19)}`;
}

export function formatDateString(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.indexOf('T');
  return t === -1 ? s : `${s.slice(0, t)}\n${s.slice(t + 1, t + 9)}`;
}

export type StatusLevel = 'online' | 'warn' | 'down' | 'unknown';

export function makeStatusDot(status: StatusLevel, tooltip?: string): HTMLElement {
  const el = document.createElement('span');
  el.className = status !== 'unknown'
    ? `panel-status-dot panel-status-dot--${status}`
    : 'panel-status-dot';
  if (tooltip) el.title = tooltip;
  return el;
}

export function buildTableSection<T>(
  label: string,
  items: T[],
  headers: (string | HTMLElement)[],
  buildRow: (item: T) => HTMLTableRowElement,
): PanelSection {
  const rows = items.map(buildRow);
  return { label, content: buildPaginatedTable(headers, rows), disabled: items.length === 0 };
}
