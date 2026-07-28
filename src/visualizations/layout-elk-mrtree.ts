import { mountWithLayout } from './shared/semi-large-network.ts';
import { elkMrtreeProvider } from '../layout-providers/elk.ts';

export const title = 'Layout: ELK Mr-Tree';
export const description =
  'The shared semi-large hierarchical network laid out with ELK Mr-Tree (minimal routing tree), which ' +
  'produces a clean top-down tree. Best when the graph is truly tree-structured; on cycles it falls ' +
  'back to a spanning tree.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, elkMrtreeProvider, `netviz-positions-${title}`);
}
