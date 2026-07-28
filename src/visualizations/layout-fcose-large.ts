import { mountWithLayout } from './shared/semi-large-network.ts';
import { fcoseLargeProvider } from '../layout-providers/fcose.ts';

export const title = 'Layout: fCOSE (large)';
export const description =
  'The shared semi-large hierarchical network laid out with the fCOSE variant tuned for large compound ' +
  'graphs: larger ideal edge length and node separation to avoid the ring/pile artifact when many ' +
  'equidistant leaf nodes share one group.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, fcoseLargeProvider, `netviz-positions-${title}`);
}
