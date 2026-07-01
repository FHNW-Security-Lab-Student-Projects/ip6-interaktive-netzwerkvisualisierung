import cytoscape from 'cytoscape';
import type { DeviceInfoOutput } from '../generated/types.gen.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { setupDetailPanel } from '../components/index.ts';
import { enrichEdges } from '../edge-enricher.ts';

export const title = 'Demo: Triangle with Warning Edge';
export const description =
  'Three devices in a triangle. The bottom edge (Switch A ↔ Switch B) has a speed mismatch and duplex mismatch warning. Click the edge to inspect.';

const mockRouter: DeviceInfoOutput = {
  serial: '',
  name: 'Core Router',
  ip_address: '10.0.0.1',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi0/1': { if_no: 'Gi0/1', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
    'Gi0/2': { if_no: 'Gi0/2', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
  },
  neighbors: {
    'demo-switch-a': { neigh_id: 'demo-switch-a', name: 'Switch A', connections: { c1: { if_local: 'Gi0/1', if_remote: 'Gi1/1' } } },
    'demo-switch-b': { neigh_id: 'demo-switch-b', name: 'Switch B', connections: { c1: { if_local: 'Gi0/2', if_remote: 'Gi2/1' } } },
  },
};

const mockSwitchA: DeviceInfoOutput = {
  serial: '',
  name: 'Switch A',
  ip_address: '10.0.0.2',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi1/1': { if_no: 'Gi1/1', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
    'Gi1/2': { if_no: 'Gi1/2', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
  },
  neighbors: {
    'demo-router':   { neigh_id: 'demo-router',   name: 'Core Router', connections: {} },
    'demo-switch-b': { neigh_id: 'demo-switch-b', name: 'Switch B',    connections: { c1: { if_local: 'Gi1/2', if_remote: 'Gi2/2' } } },
  },
};

// Switch B intentionally mismatched on the A↔B link: 100M half-duplex vs 1G full
const mockSwitchB: DeviceInfoOutput = {
  serial: '',
  name: 'Switch B',
  ip_address: '10.0.0.3',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi2/1': { if_no: 'Gi2/1', port_type: 'trunk', if_state: 'up', speed: '1G',   duplex: 'full' },
    'Gi2/2': { if_no: 'Gi2/2', port_type: 'trunk', if_state: 'up', speed: '100M', duplex: 'half' },
  },
  neighbors: {
    'demo-router':   { neigh_id: 'demo-router',   name: 'Core Router', connections: {} },
    'demo-switch-a': { neigh_id: 'demo-switch-a', name: 'Switch A',    connections: {} },
  },
};

export async function mount(container: HTMLElement): Promise<void> {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
    elements: [
      {
        group: 'nodes',
        data: { id: 'demo-router',   node_type: 'device', device_type: 'router', label: 'Core Router\n10.0.0.1', title: 'Core Router' },
        position: { x: 400, y: 100 },
      },
      {
        group: 'nodes',
        data: { id: 'demo-switch-a', node_type: 'device', device_type: 'switch', label: 'Switch A\n10.0.0.2', title: 'Switch A' },
        position: { x: 150, y: 450 },
      },
      {
        group: 'nodes',
        data: { id: 'demo-switch-b', node_type: 'device', device_type: 'switch', label: 'Switch B\n10.0.0.3', title: 'Switch B' },
        position: { x: 650, y: 450 },
      },
      { group: 'edges', data: { id: 'edge-router-a', source: 'demo-router',   target: 'demo-switch-a' } },
      { group: 'edges', data: { id: 'edge-router-b', source: 'demo-router',   target: 'demo-switch-b' } },
      { group: 'edges', data: { id: 'edge-a-b',      source: 'demo-switch-a', target: 'demo-switch-b' } },
    ],
    layout: { name: 'preset' },
  });

  setupZoom(cy);

  const mockMap = new Map<string, DeviceInfoOutput>([
    ['demo-router',   mockRouter],
    ['demo-switch-a', mockSwitchA],
    ['demo-switch-b', mockSwitchB],
  ]);

  const panelOpts = setupDetailPanel(cy, { mockDeviceData: mockMap });
  enrichEdges(cy, mockMap);

  cy.on('tap', 'node', event => {
    event.stopPropagation();
    panelOpts.onNodeClick?.((event.target as cytoscape.NodeSingular).id());
  });

  cy.fit(undefined, 80);
}
