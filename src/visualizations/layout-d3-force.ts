import { mountWithLayout } from './shared/semi-large-network.ts';
import { d3ForceProvider } from '../layout-providers/d3-force.ts';

export const title = 'Layout: D3 Force';
export const description =
  'The shared semi-large hierarchical network laid out with D3\'s force simulation (link, charge, ' +
  'collision, centering). Handles cycles and dense graphs without ring artifacts, but does not ' +
  'support compound nodes, so the site groups are not kept together.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, d3ForceProvider, `netviz-positions-${title}`);
}
