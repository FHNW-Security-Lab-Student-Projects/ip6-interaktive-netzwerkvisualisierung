import { mountWithLayout } from './shared/semi-large-network.ts';
import { elkForceProvider } from '../layout-providers/elk.ts';

export const title = 'Layout: ELK Force';
export const description =
  'The shared semi-large hierarchical network laid out with ELK Force, a spring-embedder algorithm ' +
  'that handles cycles and uses a different repulsion model than fCOSE.';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, elkForceProvider, `netviz-positions-${title}`);
}
