import cytoscape from 'cytoscape';
import { runLayout } from '../layout-utils.ts';
import { setupExpandCollapse } from '../expand-collapse.ts';
import { fcoseLargeProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { NODE_HIERARCHY } from '../node-factory.ts';
import { loadBasegraph, loadDeviceInfo } from '../graph-loader.ts';
import { setupDetailPanel, setupToolbar, setupSearch, setupZoomFitButton, setupLegend, setupComparePanel, setupCompareButton } from '../components/index.ts';

export const title = 'API Network: Original Graph';
export const description =
  'Real network data loaded live from the API. Renders the graph using our style and the fcose layout. The graph is rendered in its original form, without any preprocessing or filtering.';

const POSITIONS_KEY = `netviz-positions-${title}`;
const NETWORK_ID = 2;
const SNAPSHOT_ID = 1;

export async function mount(container: HTMLElement): Promise<void> {
  const [{ nodes, edges }, deviceInfo] = await Promise.all([
    loadBasegraph({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID }),
    loadDeviceInfo({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID }),
  ]);

  const cy = cytoscape({
    container,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
  });
  setupZoom(cy);

  cy.style().update();
  const compare = setupComparePanel({ networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const panelOpts = setupDetailPanel(cy, { networkId: NETWORK_ID, snapshotId: SNAPSHOT_ID });
  const ctrl = setupExpandCollapse(cy, nodes, edges, fcoseLargeProvider, NODE_HIERARCHY, 'all', { ...panelOpts, onCompare: compare.add, onCompareHas: compare.has });
  compare.setLocate(id => ctrl.focusNode(id));
  panelOpts.setCompareHandler(compare.add);
  panelOpts.setCompareHasHandler(compare.has);
  panelOpts.setFocusNode(id => ctrl.focusNode(id));
  panelOpts.setChildCountResolver(id => ctrl.getDirectChildCount(id));
  panelOpts.setChildrenResolver(id => ctrl.getDirectChildren(id));
  setupToolbar(ctrl, NODE_HIERARCHY, 'none');
  setupSearch(ctrl, nodes, deviceInfo);
  setupZoomFitButton(cy);
  setupCompareButton(compare.open);
  setupLegend();
  runLayout(cy, POSITIONS_KEY, fcoseLargeProvider, 0.2);
}
