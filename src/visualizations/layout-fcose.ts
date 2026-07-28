import { mountWithLayout } from './shared/semi-large-network.ts';
import { fcoseProvider } from '../layout-providers/fcose.ts';

export const title = 'Layout: fCOSE';
export const description =
  'The shared semi-large hierarchical network laid out with fCOSE, a force-directed algorithm that is ' +
  'compound-aware and keeps a group\'s members within its box. Tuned for small-to-medium graphs.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, fcoseProvider, `netviz-positions-${title}`);
}
