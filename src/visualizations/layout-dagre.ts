import { mountWithLayout } from './shared/semi-large-network.ts';
import { dagreProvider } from '../layout-providers/dagre.ts';

export const title = 'Dagre';
export const description =
  'The shared semi-large hierarchical network laid out with Dagre (a port of Graphviz dot). Produces ' +
  'clean top-down layered layouts, but has limited compound support: group boxes render yet the ' +
  'internal layout is not compound-aware, so nested groups can overlap.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, dagreProvider, `netviz-positions-${title}`);
}
