import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { LayoutProvider } from '../layout-utils.ts';

/**
 * Dagre hierarchical layout (port of Graphviz dot).
 * Produces very clean top-down layered layouts for network topologies.
 * NOTE: Limited compound node support: group backgrounds render but
 * internal layout is not compound-aware. 
 * Best results on flat graphs or when groups are all collapsed.
 * https://github.com/cytoscape/cytoscape.js-dagre
 */
const shared = {
  rankDir: 'TB',
  rankSep: 80,
  nodeSep: 60,
  ranker: 'network-simplex',
};

export const dagreProvider: LayoutProvider = {
  register() {
    cytoscape.use(dagre);
  },
  initial() {
    return {
      name: 'dagre',
      fit: true,
      padding: 40,
      animate: false,
      ...shared,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'dagre',
      fit: false,
      animate: true,
      animationDuration: 400,
      ...shared,
    } as cytoscape.LayoutOptions;
  },
};
