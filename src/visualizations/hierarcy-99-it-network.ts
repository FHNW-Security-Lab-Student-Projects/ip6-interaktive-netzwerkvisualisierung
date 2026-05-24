import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { createDeviceNode, createEdge, NODE_HIERARCHY } from '../node-factory.ts';

export const title = 'Hierarchy: it-network';
export const description = 'Illustrates different hierarchical components (routers, switches, hosts) with edges between them.';

const wsj_fw = createDeviceNode({ id: 'wsj-fw', title: 'WSJ-FW', label: 'WSJ-FW', device_type: 'router' });


const wsj_core1 = createDeviceNode({ id: 'wsj-core1', title: 'WSJ-Core1', label: 'WSJ-Core1', device_type: 'router' });
const wsj_core2 = createDeviceNode({ id: 'wsj-core2', title: 'WSJ-Core2', label: 'WSJ-Core2', device_type: 'router' });

const wsj_dist1 = createDeviceNode({ id: 'wsj-dist1', title: 'WSJ-Dist1', label: 'WSJ-Dist1', device_type: 'router' });
const wsj_dist2 = createDeviceNode({ id: 'wsj-dist2', title: 'WSJ-Dist2', label: 'WSJ-Dist2', device_type: 'router' });

const wsj_acc1 = createDeviceNode({ id: 'wsj-acc1', title: 'WSJ-Acc1', label: 'WSJ-Acc1', device_type: 'router' });
const wsj_acc2 = createDeviceNode({ id: 'wsj-acc2', title: 'WSJ-Acc2', label: 'WSJ-Acc2', device_type: 'router' });
const wsj_acc3 = createDeviceNode({ id: 'wsj-acc3', title: 'WSJ-Acc3', label: 'WSJ-Acc3', device_type: 'router' });
const wsj_acc4 = createDeviceNode({ id: 'wsj-acc4', title: 'WSJ-Acc4', label: 'WSJ-Acc4', device_type: 'router' });


const discovered_device1 = createDeviceNode({ id: 'discovered-device1', title: 'Discovered Device 1', label: 'Discovered Device 1', device_type: 'unknown' });
const discovered_device2 = createDeviceNode({ id: 'discovered-device2', title: 'Discovered Device 2', label: 'Discovered Device 2', device_type: 'unknown' });
const discovered_switch1 = createDeviceNode({ id: 'discovered-switch1', title: 'Discovered Switch 1', label: 'Discovered Switch 1', device_type: 'switch' });
const discovered_switch2 = createDeviceNode({ id: 'discovered-switch2', title: 'Discovered Switch 2', label: 'Discovered Switch 2', device_type: 'switch' });

const discovered_device3 = createDeviceNode({ id: 'discovered-device3', title: 'Discovered Device 3', label: 'Discovered Device 3', device_type: 'unknown' });
const discovered_device4 = createDeviceNode({ id: 'discovered-device4', title: 'Discovered Device 4', label: 'Discovered Device 4', device_type: 'unknown' });
const discovered_switch3 = createDeviceNode({ id: 'discovered-switch3', title: 'Discovered Switch 3', label: 'Discovered Switch 3', device_type: 'switch' });
const discovered_switch4 = createDeviceNode({ id: 'discovered-switch4', title: 'Discovered Switch 4', label: 'Discovered Switch 4', device_type: 'switch' });

const discovered_device5 = createDeviceNode({ id: 'discovered-device5', title: 'Discovered Device 5', label: 'Discovered Device 5', device_type: 'unknown' });
const discovered_device6 = createDeviceNode({ id: 'discovered-device6', title: 'Discovered Device 6', label: 'Discovered Device 6', device_type: 'unknown' });
const discovered_switch5 = createDeviceNode({ id: 'discovered-switch5', title: 'Discovered Switch 5', label: 'Discovered Switch 5', device_type: 'switch' });
const discovered_switch6 = createDeviceNode({ id: 'discovered-switch6', title: 'Discovered Switch 6', label: 'Discovered Switch 6', device_type: 'switch' });

const discovered_device7 = createDeviceNode({ id: 'discovered-device7', title: 'Discovered Device 7', label: 'Discovered Device 7', device_type: 'unknown' });
const discovered_device8 = createDeviceNode({ id: 'discovered-device8', title: 'Discovered Device 8', label: 'Discovered Device 8', device_type: 'unknown' });
const discovered_switch7 = createDeviceNode({ id: 'discovered-switch7', title: 'Discovered Switch 7', label: 'Discovered Switch 7', device_type: 'switch' });
const discovered_switch8 = createDeviceNode({ id: 'discovered-switch8', title: 'Discovered Switch 8', label: 'Discovered Switch 8', device_type: 'switch' });

// right side
const wsj_01 = createDeviceNode({ id: 'wsj-01', title: 'WSJ-01', label: 'WSJ-01', device_type: 'switch' });
const wsj_02 = createDeviceNode({ id: 'wsj-02', title: 'WSJ-02', label: 'WSJ-02', device_type: 'switch' });
const wsj_03 = createDeviceNode({ id: 'wsj-03', title: 'WSJ-03', label: 'WSJ-03', device_type: 'switch' });
const wsj_04 = createDeviceNode({ id: 'wsj-04', title: 'WSJ-04', label: 'WSJ-04', device_type: 'switch' });
const wsj_05 = createDeviceNode({ id: 'wsj-05', title: 'WSJ-05', label: 'WSJ-05', device_type: 'switch' });
const wsj_06 = createDeviceNode({ id: 'wsj-06', title: 'WSJ-06', label: 'WSJ-06', device_type: 'switch' });

const wsh_01 = createDeviceNode({ id: 'wsh-01', title: 'WSH-01', label: 'WSH-01', device_type: 'switch' });
const wro_01 = createDeviceNode({ id: 'wro-01', title: 'WRO-01', label: 'WRO-01', device_type: 'switch' });
const wro_02 = createDeviceNode({ id: 'wro-02', title: 'WRO-02', label: 'WRO-02', device_type: 'switch' });

const zfg_01 = createDeviceNode({ id: 'zfg-01', title: 'ZFG-01', label: 'ZFG-01', device_type: 'switch' });
const zfg_02 = createDeviceNode({ id: 'zfg-02', title: 'ZFG-02', label: 'ZFG-02', device_type: 'switch' });
const zfg_03 = createDeviceNode({ id: 'zfg-03', title: 'ZFG-03', label: 'ZFG-03', device_type: 'switch' });


const nodes = [wsj_fw, wsj_core1, wsj_core2, wsj_dist1, wsj_dist2, wsj_acc1, wsj_acc2, wsj_acc3, wsj_acc4, discovered_device1, discovered_device2, discovered_device3, discovered_device4, discovered_device5, discovered_device6, discovered_device7, discovered_device8, discovered_switch1, discovered_switch2, discovered_switch3, discovered_switch4, discovered_switch5, discovered_switch6, discovered_switch7, discovered_switch8, wsj_01, wsj_02, wsj_03, wsj_04, wsj_05, wsj_06, wsh_01, wro_01, wro_02, zfg_01, zfg_02, zfg_03 ];

const edges = [
  createEdge({ source: wsj_core1, target: wsj_fw }),
  createEdge({ source: wsj_core2, target: wsj_fw }),


  createEdge({ source: wsj_dist1, target: wsj_core1 }),
  createEdge({ source: wsj_dist1, target: wsj_core2 }),

  createEdge({ source: wsj_dist2, target: wsj_core1 }),
  createEdge({ source: wsj_dist2, target: wsj_core2 }),

  createEdge({ source: wsj_dist1, target: wsj_dist2 }),

  createEdge({ source: wsj_acc1, target: wsj_dist1 }),
  createEdge({ source: wsj_acc1, target: wsj_dist2 }),

  createEdge({ source: wsj_acc2, target: wsj_dist1 }),
  createEdge({ source: wsj_acc2, target: wsj_dist2 }),

  createEdge({ source: wsj_acc3, target: wsj_dist1 }),
  createEdge({ source: wsj_acc3, target: wsj_dist2 }),

  createEdge({ source: wsj_acc4, target: wsj_dist1 }),
  createEdge({ source: wsj_acc4, target: wsj_dist2 }),


  createEdge({ source: discovered_device1, target: wsj_acc1 }),
  createEdge({ source: discovered_device2, target: wsj_acc1 }),
  createEdge({ source: discovered_switch1, target: wsj_acc1 }),
  createEdge({ source: discovered_switch2, target: wsj_acc1 }),

  createEdge({ source: discovered_device3, target: wsj_acc2 }),
  createEdge({ source: discovered_device4, target: wsj_acc2 }),
  createEdge({ source: discovered_switch3, target: wsj_acc2 }),
  createEdge({ source: discovered_switch4, target: wsj_acc2 }),

  createEdge({ source: discovered_device5, target: wsj_acc3 }),
  createEdge({ source: discovered_device6, target: wsj_acc3 }),
  createEdge({ source: discovered_switch5, target: wsj_acc3 }),
  createEdge({ source: discovered_switch6, target: wsj_acc3 }),

  createEdge({ source: discovered_device7, target: wsj_acc4 }),
  createEdge({ source: discovered_device8, target: wsj_acc4 }),
  createEdge({ source: discovered_switch7, target: wsj_acc4 }),
  createEdge({ source: discovered_switch8, target: wsj_acc4 }),

  // right side
  createEdge({ source: wsj_04, target: wsj_fw }),
  createEdge({ source: wsj_05, target: wsj_fw }),
  createEdge({ source: wsj_03, target: wsj_04 }),
  createEdge({ source: wsj_03, target: wsj_05 }),
  createEdge({ source: wsj_06, target: wsj_04 }),
  createEdge({ source: wsj_06, target: wsj_05 }),
  createEdge({ source: wsj_01, target: wsj_03 }),
  createEdge({ source: wsj_02, target: wsj_01 }),

  createEdge({ source: wsh_01, target: wsj_06 }),
  createEdge({ source: wro_02, target: wsh_01 }),
  createEdge({ source: wro_01, target: wro_02 }),

  createEdge({ source: zfg_01, target: wro_01 }),
  createEdge({ source: zfg_02, target: zfg_01 }),
  createEdge({ source: zfg_03, target: zfg_02 }),
  createEdge({ source: zfg_03, target: wsj_01 }),
  


];

const POSITIONS_KEY = `netviz-positions-${title}`;

export function mount(container: HTMLElement): void {
  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    wheelSensitivity: 0.1,
    style: createNetworkStyles(),
  });

  cy.style().update();
  setupExpandCollapse(cy, nodes, edges, fcoseProvider, NODE_HIERARCHY);
  runLayout(cy, POSITIONS_KEY, fcoseProvider, 0.2);
}
