import cytoscape from 'cytoscape';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';

export const title = 'Edge Styles';
export const description =
  'Overview of all edge types and states used in the Netmap. Each row shows an example pair with the ' +
  'respective style.';

type Row = {
  name: string;
  desc: string;
  left: 'router' | 'switch';
  right: 'router' | 'switch';
  classes?: string;
};

const rows: Row[] = [
  { name: 'R1', desc: 'Default Connection', left: 'router', right: 'switch' },
  { name: 'R1', desc: 'VLAN / VPN / GRE', left: 'router', right: 'switch', classes: 'logical' },
  { name: 'R1', desc: 'Link Aggregation', left: 'router', right: 'switch', classes: 'lag' },
  { name: 'R1', desc: 'Redundant Uplink', left: 'router', right: 'router', classes: 'uplink' },
  { name: 'R1', desc: 'L3 / Routed', left: 'router', right: 'router', classes: 'routed' },
  { name: 'R1', desc: 'Port Down', left: 'router', right: 'switch', classes: 'down' },
  { name: 'R1', desc: 'STP Blocked', left: 'router', right: 'switch', classes: 'disabled' },
  { name: 'R1', desc: 'Errors / Warning', left: 'router', right: 'switch', classes: 'warning' },
  { name: 'R1', desc: 'Selected Edge', left: 'router', right: 'switch', classes: 'highlight' },
  { name: 'R1', desc: 'LAG with Warning', left: 'router', right: 'switch', classes: 'lag warning' },
];

const X_LEFT = 200;
const X_RIGHT = 560;
const Y_START = 120;
const Y_STEP = 120;

function nodeData(id: string, deviceType: 'router' | 'switch', label: string) {
  return { id, node_type: 'device', device_type: deviceType, label, title: label };
}

export function mount(container: HTMLElement): void {
  const elements: cytoscape.ElementDefinition[] = [];

  rows.forEach((row, i) => {
    const y = Y_START + i * Y_STEP;
    const leftId = `edge-style-${i}-l`;
    const rightId = `edge-style-${i}-r`;

    elements.push({
      group: 'nodes',
      data: nodeData(leftId, row.left, `${row.name}\n${row.desc}`),
      position: { x: X_LEFT, y },
    });
    elements.push({
      group: 'nodes',
      data: nodeData(rightId, row.right, ''),
      position: { x: X_RIGHT, y },
    });
    elements.push({
      group: 'edges',
      data: { id: `edge-style-${i}`, source: leftId, target: rightId },
      ...(row.classes !== undefined ? { classes: row.classes } : {}),
    });
  });

  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
    elements,
    layout: { name: 'preset' },
  });

  setupZoom(cy);
  cy.fit(undefined, 80);
}
