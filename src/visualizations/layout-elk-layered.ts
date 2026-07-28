import { mountWithLayout } from './shared/semi-large-network.ts';
import { elkLayeredProvider } from '../layout-providers/elk.ts';

export const title = 'Layout: ELK Layered';
export const description =
  'The shared semi-large hierarchical network laid out with ELK Layered, a hierarchical top-down ' +
  'algorithm. Best for DAG-like structures; the redundant WAN links introduce cycles that this ' +
  'layout handles less cleanly (arc/ring artifacts).';

export function mount(container: HTMLElement): void {
  mountWithLayout(container, elkLayeredProvider, `netviz-positions-${title}`);
}
