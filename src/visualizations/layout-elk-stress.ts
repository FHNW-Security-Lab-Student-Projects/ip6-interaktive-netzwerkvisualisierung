import { mountWithLayout } from './shared/semi-large-network.ts';
import { elkStressProvider } from '../layout-providers/elk.ts';

export const title = 'Layout: ELK Stress';
export const description =
  'The shared semi-large hierarchical network laid out with ELK Stress (stress-majorization). Handles ' +
  'cycles correctly and positions nodes so graph-theoretic distances match Euclidean distances — ' +
  'suited to real network graphs with redundant links.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, elkStressProvider, `netviz-positions-${title}`);
}
