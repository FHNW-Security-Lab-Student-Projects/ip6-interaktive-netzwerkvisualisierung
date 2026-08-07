import { getIconData, iconToSVG } from '@iconify/utils';
import { icons as carbonIcons } from '@iconify-json/carbon';
import { Colors, lighten } from '../network-styles.ts';

export function setupLegend(): void {
  const el = document.getElementById('toolbar');
  if (!el) return;

  function carbonSvg(name: string, color = '#fff', size = 11): string {
    const data = getIconData(carbonIcons, name);
    if (!data) return '';
    const { attributes, body } = iconToSVG(data, { height: 'auto' });
    const vb = (attributes as Record<string, string>).viewBox ?? '0 0 32 32';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}">${body.replace(/currentColor/g, color)}</svg>`;
  }

  // Fixed swatch column width so all symbols align regardless of individual shape dimensions.
  const SWATCH_W = 26;

  // w/h: actual shape dimensions; the shape is centered in the fixed SWATCH_W container.
  // iconOffset: optional {x,y} shift (px) for icons that visually appear off-center within their shape.
  function nodeRow(label: string, color: string, icon: string, svgShape: string, w: number, h: number, iconSize = 11, iconOffset?: { x: number; y: number }): string {
    const translate = iconOffset ? `transform:translate(${iconOffset.x}px,${iconOffset.y}px);` : '';
    return `<div style="display:flex;align-items:center;gap:7px;padding:3px 10px;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:${SWATCH_W}px;flex-shrink:0;">
        <span style="position:relative;display:inline-block;width:${w}px;height:${h}px;">
          <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;"><${svgShape} fill="${color}"/></svg>
          <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${translate}">${carbonSvg(icon, '#fff', iconSize)}</span>
        </span>
      </span>
      <span style="font-size:0.8rem;color:#222;">${label}</span>
    </div>`;
  }

  // Matches collapsed compound style: full solid fill + lighter dashed border (mirrors Cytoscape).
  function compoundRow(label: string, color: string, svgShape: string, w: number, h: number): string {
    const stroke = lighten(color, 0.45);
    return `<div style="display:flex;align-items:center;gap:7px;padding:3px 10px;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:${SWATCH_W}px;flex-shrink:0;">
        <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
          <${svgShape} fill="${color}" stroke="${stroke}" stroke-width="2" stroke-dasharray="3,2"/>
        </svg>
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
      ${nodeRow('Router',  C.ROUTER,  'router',         'polygon points="25,11 19,1 7,1 1,11 7,21 19,21"',          26, 22, 15, { x: 0, y: -1 })}
      ${nodeRow('Switch',  C.SWITCH,  'switch-layer-2', 'rect x="1" y="1" width="24" height="11" rx="2"',           26, 13)}
      ${nodeRow('Host',    C.HOST,    'laptop',         'ellipse cx="11" cy="11" rx="10" ry="10"',                  22, 22, 11, { x: 0, y: -1 })}
      ${nodeRow('Custom',  C.CUSTOM,  'lightning',      'polygon points="11,1 21,11 11,21 1,11"',                   22, 22)}
      ${nodeRow('Unknown', C.UNKNOWN, 'help',           'ellipse cx="11" cy="11" rx="10" ry="10"',                  22, 22, 11, { x: 0, y: -1 })}
    </div>
    <div style="${colStyle}${divStyle}">
      ${colHeader('Compounds')}
      ${compoundRow('Node',   C.COMPOUND, 'ellipse cx="11" cy="11" rx="10" ry="10"',                  22, 22)}
      ${compoundRow('Router', C.ROUTER,   'polygon points="25,11 19,1 7,1 1,11 7,21 19,21"',          26, 22)}
      ${compoundRow('Switch', C.SWITCH,   'rect x="1" y="1" width="24" height="11" rx="2"',           26, 13)}
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

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-icon-btn';
  btn.title = 'Legend';
  btn.style.cssText = 'font-weight:700;font-size:13px;margin-left:0;';
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
    p.style.right = `${Math.max(4, window.innerWidth - rect.right)}px`;
    p.style.top   = `${rect.bottom + 6}px`;

    const onKey  = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cleanup(); };
    const onDown = (ev: MouseEvent)    => { if (!p.contains(ev.target as Node) && ev.target !== btn) cleanup(); };
    function cleanup() { p.remove(); panel = null; document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
  });
}
