import { mountWithLayout } from './shared/semi-large-network.ts';
import { colaProvider } from '../layout-providers/cola.ts';

export const title = 'Cola';
export const description =
  'The shared semi-large hierarchical network laid out with Cola (WebCola), a constraint-based ' +
  'algorithm that handles compound nodes and cycles well and supports a flow direction for ' +
  'hierarchical networks.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, colaProvider, `netviz-positions-${title}`);
}
