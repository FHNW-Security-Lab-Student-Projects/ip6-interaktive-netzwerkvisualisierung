import { getIconData, iconToSVG } from '@iconify/utils';
import { icons as carbonIcons } from '@iconify-json/carbon';
import { Colors, lighten } from '../network-styles.ts';

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
