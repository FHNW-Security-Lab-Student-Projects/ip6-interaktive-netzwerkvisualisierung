import cytoscape from 'cytoscape';
import type { DeviceInfoOutput } from '../generated/types.gen.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { setupDetailPanel } from '../components/index.ts';

export const title = 'Demo: Edge Warning Rules';
export const description =
  'Synthetic graph demonstrating edge panel behaviour. ' +
  'Pair A: click the edge to see all 7 warning rules. ' +
  'Pair B: LAG with one member down (warn). ' +
  'Pair C: LAG with both members down (down).';

// Pair A — triggers all 7 warning rules across 4 connection pairs:
//   c1 (Gi0/1 <-> Gi1/1): typeMismatch, asymmetricState, speedMismatch, duplexMismatch
//   c2 (Gi0/2 <-> Gi1/2): errDisabled, asymmetricState
//   c3 (Gi0/3 <-> Gi1/3): taggedVlanMismatch
//   c4 (Gi0/4 <-> Gi1/4): nativeVlanMismatch
const mockRouterA: DeviceInfoOutput = {
  serial: '',
  name: 'Demo Router A',
  ip_address: '10.0.0.1',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi0/1': { if_no: 'Gi0/1', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
    'Gi0/2': { if_no: 'Gi0/2', if_state: 'err-disabled' },
    'Gi0/3': { if_no: 'Gi0/3', tagged: '10,20,30' },
    'Gi0/4': { if_no: 'Gi0/4', untagged: 100 },
  },
  neighbors: {
    'demo-switch-a': {
      neigh_id: 'demo-switch-a',
      name: 'Demo Switch A',
      connections: {
        c1: { if_local: 'Gi0/1', if_remote: 'Gi1/1' },
        c2: { if_local: 'Gi0/2', if_remote: 'Gi1/2' },
        c3: { if_local: 'Gi0/3', if_remote: 'Gi1/3' },
        c4: { if_local: 'Gi0/4', if_remote: 'Gi1/4' },
      },
    },
  },
};

const mockSwitchA: DeviceInfoOutput = {
  serial: '',
  name: 'Demo Switch A',
  ip_address: '10.0.0.2',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi1/1': { if_no: 'Gi1/1', port_type: 'access', if_state: 'down', speed: '100M', duplex: 'half' },
    'Gi1/2': { if_no: 'Gi1/2', if_state: 'up' },
    'Gi1/3': { if_no: 'Gi1/3', tagged: '10,20' },
    'Gi1/4': { if_no: 'Gi1/4', untagged: 200 },
  },
  neighbors: { 'demo-router-a': { neigh_id: 'demo-router-a', name: 'Demo Router A', connections: {} } },
};

// Pair B — LAG, one member down -> warn
const mockRouterB: DeviceInfoOutput = {
  serial: '',
  name: 'Demo Router B',
  ip_address: '10.0.1.1',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  lags: {
    Po1: { group_id: '1', name: 'Port-channel1', protocol: 'lacp', members: { 'Gi0/1': { if_no: 'Gi0/1' }, 'Gi0/2': { if_no: 'Gi0/2' } } },
  },
  ports: {
    'Gi0/1': { if_no: 'Gi0/1', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
    'Gi0/2': { if_no: 'Gi0/2', port_type: 'trunk', if_state: 'down', speed: '1G', duplex: 'full' },
  },
  neighbors: {
    'demo-switch-b': {
      neigh_id: 'demo-switch-b',
      name: 'Demo Switch B',
      connections: {
        c1: { if_local: 'Gi0/1', if_remote: 'Gi1/1' },
        c2: { if_local: 'Gi0/2', if_remote: 'Gi1/2' },
      },
    },
  },
};

const mockSwitchB: DeviceInfoOutput = {
  serial: '',
  name: 'Demo Switch B',
  ip_address: '10.0.1.2',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi1/1': { if_no: 'Gi1/1', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
    'Gi1/2': { if_no: 'Gi1/2', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
  },
  neighbors: { 'demo-router-b': { neigh_id: 'demo-router-b', name: 'Demo Router B', connections: {} } },
};

// Pair C — LAG, both members down -> down
const mockRouterC: DeviceInfoOutput = {
  serial: '',
  name: 'Demo Router C',
  ip_address: '10.0.2.1',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  lags: {
    Po1: { group_id: '1', name: 'Port-channel1', protocol: 'lacp', members: { 'Gi0/1': { if_no: 'Gi0/1' }, 'Gi0/2': { if_no: 'Gi0/2' } } },
  },
  ports: {
    'Gi0/1': { if_no: 'Gi0/1', port_type: 'trunk', if_state: 'down', speed: '1G', duplex: 'full' },
    'Gi0/2': { if_no: 'Gi0/2', port_type: 'trunk', if_state: 'down', speed: '1G', duplex: 'full' },
  },
  neighbors: {
    'demo-switch-c': {
      neigh_id: 'demo-switch-c',
      name: 'Demo Switch C',
      connections: {
        c1: { if_local: 'Gi0/1', if_remote: 'Gi1/1' },
        c2: { if_local: 'Gi0/2', if_remote: 'Gi1/2' },
      },
    },
  },
};

const mockSwitchC: DeviceInfoOutput = {
  serial: '',
  name: 'Demo Switch C',
  ip_address: '10.0.2.2',
  known: true,
  last_seen: Math.floor(Date.now() / 1000) - 3600,
  ports: {
    'Gi1/1': { if_no: 'Gi1/1', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
    'Gi1/2': { if_no: 'Gi1/2', port_type: 'trunk', if_state: 'up', speed: '1G', duplex: 'full' },
  },
  neighbors: { 'demo-router-c': { neigh_id: 'demo-router-c', name: 'Demo Router C', connections: {} } },
};

export async function mount(container: HTMLElement): Promise<void> {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
    elements: [
      // Pair A: all 7 warning rules
      {
        group: 'nodes',
        data: { id: 'demo-router-a', node_type: 'device', device_type: 'router', label: 'Demo Router A\n10.0.0.1', title: 'Demo Router A' },
        position: { x: 200, y: 150 },
      },
      {
        group: 'nodes',
        data: { id: 'demo-switch-a', node_type: 'device', device_type: 'switch', label: 'Demo Switch A\n10.0.0.2', title: 'Demo Switch A' },
        position: { x: 600, y: 150 },
      },
      { group: 'edges', data: { id: 'demo-edge-a', source: 'demo-router-a', target: 'demo-switch-a' } },

      // Pair B: LAG, one member down -> warn
      {
        group: 'nodes',
        data: { id: 'demo-router-b', node_type: 'device', device_type: 'router', label: 'Demo Router B\n10.0.1.1', title: 'Demo Router B' },
        position: { x: 200, y: 400 },
      },
      {
        group: 'nodes',
        data: { id: 'demo-switch-b', node_type: 'device', device_type: 'switch', label: 'Demo Switch B\n10.0.1.2', title: 'Demo Switch B' },
        position: { x: 600, y: 400 },
      },
      { group: 'edges', data: { id: 'demo-edge-b', source: 'demo-router-b', target: 'demo-switch-b' }, classes: 'lag' },

      // Pair C: LAG, both members down -> down
      {
        group: 'nodes',
        data: { id: 'demo-router-c', node_type: 'device', device_type: 'router', label: 'Demo Router C\n10.0.2.1', title: 'Demo Router C' },
        position: { x: 200, y: 650 },
      },
      {
        group: 'nodes',
        data: { id: 'demo-switch-c', node_type: 'device', device_type: 'switch', label: 'Demo Switch C\n10.0.2.2', title: 'Demo Switch C' },
        position: { x: 600, y: 650 },
      },
      { group: 'edges', data: { id: 'demo-edge-c', source: 'demo-router-c', target: 'demo-switch-c' }, classes: 'lag' },
    ],
    layout: { name: 'preset' },
  });

  setupZoom(cy);

  const mockMap = new Map<string, DeviceInfoOutput>([
    ['demo-router-a', mockRouterA],
    ['demo-switch-a', mockSwitchA],
    ['demo-router-b', mockRouterB],
    ['demo-switch-b', mockSwitchB],
    ['demo-router-c', mockRouterC],
    ['demo-switch-c', mockSwitchC],
  ]);

  const panelOpts = setupDetailPanel(cy, { mockDeviceData: mockMap });

  cy.on('tap', 'node', event => {
    event.stopPropagation();
    panelOpts.onNodeClick?.((event.target as cytoscape.NodeSingular).id(), false);
  });

  cy.fit(undefined, 80);
}
