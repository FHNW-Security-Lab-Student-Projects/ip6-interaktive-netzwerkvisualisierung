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
  STATE_DOWN:      '#b03838',  // dark crimson
  STATE_WARNING:   '#a07828',  // dark amber (distinct from HOST slate-gray)
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
  LAGG:     'lagg',
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
  // Admin shut or STP blocked.
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
        'background-image': 'none',
        'border-width': 0,
        'padding': '48px',
        'shadow-blur': 0,
        'shadow-opacity': 0,
        'label': (ele: cytoscape.NodeSingular) => `${(ele.data('label') as string) ?? ''} ⌄`,
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': 14,
        'font-size': '10px',
        'font-weight': 'bold',
        'color': '#ffffff',
        'text-background-color': (ele: cytoscape.NodeSingular) => nodeTypeColor(ele),
        'text-background-opacity': 1,
        'text-background-shape': 'roundrectangle',
        'text-background-padding': '4px',
        'text-border-color': (ele: cytoscape.NodeSingular) => darken(nodeTypeColor(ele), 0.25),
        'text-border-width': 1,
        'text-border-opacity': 1,
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
      selector: 'edge.lagg',
      style: {
        'line-style': 'double',
        'width': 3,
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
        'target-arrow-shape': 'triangle',
        'target-arrow-color': Colors.EDGE,
        'arrow-scale': 1.2,
      },
    },

    // Edge state overrides, ascending priority: disabled < down < warning < highlight
    {
      selector: 'edge.disabled',
      style: {
        'line-color': lighten(Colors.STATE_DISABLED, 0.15),
        'opacity': 0.5,
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
        'line-color': Colors.SELECTED,
        'width': 3.5,
        'opacity': 1,
      },
    },
  ];
}
