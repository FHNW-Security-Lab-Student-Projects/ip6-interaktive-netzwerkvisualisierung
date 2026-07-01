import type cytoscape from 'cytoscape';
import { getIconData, iconToSVG } from '@iconify/utils';
import { icons as carbonIcons } from '@iconify-json/carbon';

// Pre-computes SVG data URLs from Iconify icon sets at module load time (synchronous).
// color defaults to white so icons are visible on the colored node backgrounds.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function iconUrl(set: any, name: string, color = '#ffffff'): string {
  const data = getIconData(set, name);
  if (!data) return 'none';
  const { attributes, body } = iconToSVG(data, { height: 'auto' });
  const attrs = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`
    .replace(/currentColor/g, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const NodeIcon = {
  ROUTER:  iconUrl(carbonIcons, 'router'),
  SWITCH:  iconUrl(carbonIcons, 'switch-layer-2'),
  HOST:    iconUrl(carbonIcons, 'laptop'),
  CUSTOM:  iconUrl(carbonIcons,    'lightning'),
  UNKNOWN: iconUrl(carbonIcons,    'help'),
} as const;


// t = 0..1: fraction to move toward white (lighten) or black (darken).

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
    .join('');
}

// Move hex color t fraction toward white.
export function lighten(hex: string, t: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

// Move hex color t fraction toward black.
export function darken(hex: string, t: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

// One constant per semantic role. All style values derive from these.
export const Colors = {
  // Device types
  ROUTER:   '#3a6bbf',  // steel blue
  SWITCH:   '#27896b',  // dark jade
  HOST:     '#6a7e9e',  // slate blue-gray (passive endpoints)
  CUSTOM:   '#6a4ab8',  // muted violet
  UNKNOWN:  '#52626f',  // dark slate

  // Compound / group nodes
  COMPOUND: '#3f5a78',  // steel-slate — border and label badge color

  // Physical / default edge
  EDGE:     '#68788a',  // medium slate

  // Operational states — base colors; lighter/darker variants computed below
  STATE_DOWN:      '#dc2626',  // red — matches .panel-status-dot--down
  STATE_WARNING:   '#f59e0b',  // amber — matches .panel-status-dot--warn
  STATE_HIGHLIGHT: '#3a82cc',  // azure blue
  STATE_DISABLED:  '#2e3d4c',  // near-black slate

  // Selection
  SELECTED: '#d4a820',  // gold
} as const;

// Edge type class names
export const EdgeClass = {
  // Virtual overlay (VPN, VLAN, GRE tunnel). Dashed gray line.
  LOGICAL:  'logical',
  // Link aggregation group (802.3ad, port channel). Double solid line.
  LAG:      'lag',
  // Redundant uplink to a second router. Curved dashed blue arc.
  UPLINK:   'uplink',
  // Routed / L3 peering (BGP, static route). Solid line with arrowhead.
  ROUTED:   'routed',
} as const;

// Node state class names
// Priority when multiple states coexist (highest wins): highlight > warning > down > disabled.
export const NodeState = {
  // Device unreachable or powered off.
  DOWN:      'down',
  // Administratively shut down.
  DISABLED:  'disabled',
  // Degraded performance or config mismatch.
  WARNING:   'warning',
  // Path tracing or search result.
  HIGHLIGHT: 'highlight',
} as const;

// Edge state class names
export const EdgeState = {
  // Port down or cable unplugged.
  DOWN:      'down',
  // Admin shut or STP blocked — port is up but not forwarding traffic.
  DISABLED:  'disabled',
  // High utilization or errors.
  WARNING:   'warning',
  // Path tracing or search result.
  HIGHLIGHT: 'highlight',
} as const;


// Returns the fill color for a node based on its type/device_type data fields.
function nodeTypeColor(ele: cytoscape.NodeSingular): string {
  const nt = ele.data('node_type') as string;
  const dt = ele.data('device_type') as string;
  if (nt === 'device') {
    if (dt === 'router') return Colors.ROUTER;
    if (dt === 'switch') return Colors.SWITCH;
    return Colors.UNKNOWN;
  }
  if (nt === 'host')   return Colors.HOST;
  if (nt === 'custom') return Colors.CUSTOM;
  return Colors.COMPOUND; // group
}


// A device not seen within this window is treated as down.
export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

// Generates a data URL for the compound node label badge: colored rect + optional Carbon icon + text.
// Handles multi-line labels (newline-separated) by stacking lines vertically, centered horizontally.
function compoundBadgeUrl(label: string, iconName: string | null, bgColor: string, borderColor: string): string {
  const lines = label.split('\n');
  const padX = 8;
  const padY = 6;
  const lineH = 14;
  const gap = iconName ? 6 : 0;
  const totalH = padY + lines.length * lineH + padY;
  const iconSize = totalH - 2 * padY; // icon fills full text height
  const iconW = iconName ? iconSize : 0;
  const maxLineWidth = Math.ceil(Math.max(...lines.map(l => l.length)) * 6.2);
  const totalW = padX + iconW + gap + maxLineWidth + padX;
  const textCenterX = padX + iconW + gap + maxLineWidth / 2;

  let iconPart = '';
  if (iconName) {
    const data = getIconData(carbonIcons, iconName);
    if (data) {
      const { attributes, body } = iconToSVG(data, { height: 'auto' });
      const vb = (attributes as Record<string, string>).viewBox ?? '0 0 32 32';
      iconPart = `<svg x="${padX}" y="${padY}" width="${iconSize}" height="${iconSize}" viewBox="${vb}">${body.replace(/currentColor/g, '#fff')}</svg>`;
    }
  }

  const textLines = lines.map((line, i) => {
    const y = padY + i * lineH + lineH * 0.78;
    const isFirst = i === 0;
    return `<text x="${textCenterX}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="${isFirst ? 'bold' : 'normal'}" fill="#fff" opacity="${isFirst ? 1 : 0.8}">${line}</text>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}">
    <rect rx="4" ry="4" width="${totalW}" height="${totalH}" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>
    ${iconPart}
    ${textLines}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Stylesheet
// Selector order: base -> type shapes -> compound box -> collapsed -> node states -> edge base -> edge types -> edge states -> :selected

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createNetworkStyles(): any[] {
  return [
    // Base node
    {
      selector: 'node',
      style: {
        'label': (ele: cytoscape.NodeSingular) => (ele.data('label') as string) ?? '',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'font-size': '9px',
        'color': '#111111',
        'text-wrap': 'wrap',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.85,
        'text-background-shape': 'roundrectangle',
        'text-background-padding': '2px',
        'width': 40,
        'height': 40,
        'z-index': 1,
      },
    },

    // Node type styles
    {
      selector: "node[node_type='device'][device_type='router']",
      style: {
        'shape': 'hexagon',
        'width': 50,
        'height': 44,
        'background-color': Colors.ROUTER,
        'background-opacity': 1,
        'background-image': NodeIcon.ROUTER,
        'background-width': '65%',
        'background-height': '65%',
        'background-fit': 'contain',
      },
    },
    {
      selector: "node[node_type='device'][device_type='switch']",
      style: {
        'shape': 'rectangle',
        'background-color': Colors.SWITCH,
        'background-opacity': 1,
        'width': 54,
        'height': 28,
        'background-image': NodeIcon.SWITCH,
        'background-width': '55%',
        'background-height': '75%',
        'background-fit': 'contain',
      },
    },
    {
      selector: "node[node_type='host']",
      style: {
        'shape': 'ellipse',
        'background-color': Colors.HOST,
        'background-opacity': 1,
        'background-image': NodeIcon.HOST,
        'background-width': '65%',
        'background-height': '65%',
        'background-fit': 'contain',
      },
    },
    {
      selector: "node[node_type='custom']",
      style: {
        'shape': 'diamond',
        'background-color': Colors.CUSTOM,
        'background-opacity': 1,
        'background-image': NodeIcon.CUSTOM,
        'background-width': '55%',
        'background-height': '55%',
        'background-fit': 'contain',
      },
    },
    {
      selector: "node[node_type='device'][device_type='unknown']",
      style: {
        'shape': 'ellipse',
        'background-color': Colors.UNKNOWN,
        'background-opacity': 1,
        'background-image': NodeIcon.UNKNOWN,
        'background-width': '65%',
        'background-height': '65%',
        'background-fit': 'contain',
      },
    },
    {
      selector: "node[node_type='group']",
      style: {
        'shape': 'round-rectangle',
        'background-color': Colors.COMPOUND,
        'background-opacity': 0.08,
      },
    },

    // Expanded compound, solid tinted fill
    {
      selector: 'node:parent:not(.collapsed)',
      style: {
        'shape': 'round-rectangle',
        'background-color': (ele: cytoscape.NodeSingular) => nodeTypeColor(ele),
        'background-opacity': 0.07,
        'background-image': (ele: cytoscape.NodeSingular) => {
          const label = (ele.data('label') as string) ?? '';
          const dt = ele.data('device_type') as string | undefined;
          const nt = ele.data('node_type') as string | undefined;
          const bgColor = nodeTypeColor(ele);
          const borderColor = darken(bgColor, 0.25);
          let iconName: string | null = null;
          if (nt === 'device') {
            if (dt === 'router') iconName = 'router';
            else if (dt === 'switch') iconName = 'switch-layer-2';
          }
          return compoundBadgeUrl(label, iconName, bgColor, borderColor);
        },
        'background-width': (ele: cytoscape.NodeSingular) => {
          const label = (ele.data('label') as string) ?? '';
          const lines = label.split('\n');
          const dt = ele.data('device_type') as string | undefined;
          const nt = ele.data('node_type') as string | undefined;
          const hasIcon = nt === 'device' && (dt === 'router' || dt === 'switch');
          const maxLineW = Math.ceil(Math.max(...lines.map(l => l.length)) * 6.2);
          return `${7 + (hasIcon ? 19 : 0) + maxLineW + 7}px`;
        },
        'background-height': (ele: cytoscape.NodeSingular) => {
          const label = (ele.data('label') as string) ?? '';
          const lines = label.split('\n');
          return `${5 + lines.length * 13 + 5}px`;
        },
        'background-position-x': '50%',
        'background-position-y': '10px',
        'background-fit': 'none',
        'border-width': 0,
        'padding': '48px',
        'shadow-blur': 0,
        'shadow-opacity': 0,
        'label': '',
        'text-background-opacity': 0,
        'text-border-opacity': 0,
        'z-index': 2,
        'cursor': 'pointer',
      },
    },
    // Collapsed compound, type shape/color preserved, dashed border to signal it has children.
    // No width/height override so switch and router keep their type dimensions.
    {
      selector: 'node.collapsed',
      style: {
        'background-opacity': 1,
        'background-image': 'none',
        'border-width': 2.5,
        'border-style': 'dashed',
        'border-color': (ele: cytoscape.NodeSingular) => lighten(nodeTypeColor(ele), 0.45),
        'padding': 0,
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'font-size': '9px',
        'cursor': 'pointer',
        'z-index': 2,
      },
    },

    // Node state overrides, ascending priority: disabled < down < warning < highlight
    {
      selector: 'node.disabled',
      style: {
        'background-color': Colors.STATE_DISABLED,
        'background-opacity': 1,
        'opacity': 0.5,
      },
    },
    {
      selector: 'node.down',
      style: {
        'background-color': Colors.STATE_DOWN,
        'background-opacity': 1,
        'opacity': 1,
      },
    },
    {
      selector: 'node.warning',
      style: {
        'background-color': Colors.STATE_WARNING,
        'background-opacity': 1,
        'opacity': 1,
      },
    },
    {
      selector: 'node.highlight',
      style: {
        'background-color': Colors.STATE_HIGHLIGHT,
        'background-opacity': 1,
        'opacity': 1,
        'shadow-blur': 14,
        'shadow-color': Colors.STATE_HIGHLIGHT,
        'shadow-opacity': 0.45,
        'shadow-offset-x': 0,
        'shadow-offset-y': 0,
      },
    },

    // Base edge
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'line-color': Colors.EDGE,
        'width': 1.5,
        'z-index': 1,
      },
    },

    // Edge type styles
    {
      selector: 'edge.logical',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [7, 4],
      },
    },
    {
      selector: 'edge.lag',
      style: {
        'line-style': 'double',
        'width': 5,
      },
    },
    {
      selector: 'edge.uplink',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 80,
        'control-point-weights': 0.5,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'line-color': lighten(Colors.COMPOUND, 0.3),
        'width': 1.5,
      },
    },
    {
      selector: 'edge.routed',
      style: {
        'line-color': Colors.ROUTER,
        'line-style': 'dashed',
        'line-dash-pattern': [3, 6],
        'width': 2,
      },
    },

    // Edge state overrides, ascending priority: disabled < down < warning < highlight
    {
      selector: 'edge.disabled',
      style: {
        // STP-blocked: link is physically up but not forwarding — show as muted dashed, not "dead"
        'line-color': lighten(Colors.EDGE, 0.25),
        'line-style': 'dashed',
        'line-dash-pattern': [4, 5],
        'opacity': 0.85,
      },
    },
    {
      selector: 'edge.down',
      style: {
        'line-color': lighten(Colors.STATE_DOWN, 0.2),
        'line-style': 'dashed',
        'line-dash-pattern': [5, 3],
        'opacity': 1,
      },
    },
    {
      selector: 'edge.warning',
      style: {
        'line-color': lighten(Colors.STATE_WARNING, 0.2),
        'width': 2.5,
        'opacity': 1,
      },
    },
    {
      selector: 'edge.highlight',
      style: {
        'line-color': lighten(Colors.STATE_HIGHLIGHT, 0.15),
        'width': 3.5,
        'opacity': 1,
      },
    },

    // LAG + state: after state overrides so these win by order.
    // down/disabled: keep the thicker line so the LAG is recognisable even when broken.
    // warning: full LAG style (double, width 5) with the exact status-indicator amber — no lightening.
    { selector: 'edge.lag.down',     style: { 'width': 5 } },
    { selector: 'edge.lag.disabled', style: { 'width': 5, 'opacity': 0.5 } },
    { selector: 'edge.lag.warning',  style: { 'line-style': 'double', 'width': 5, 'line-color': Colors.STATE_WARNING } },

    // :selected, defined last so it always wins
    {
      selector: 'node:selected',
      style: {
        'overlay-color': Colors.SELECTED,
        'overlay-opacity': 0.3,
        'overlay-padding': 4,
      },
    },
    {
      selector: 'edge:selected',
      style: {
        'overlay-color': Colors.SELECTED,
        'overlay-opacity': 0.3,
        'overlay-padding': 4,
      },
    },
  ];
}
