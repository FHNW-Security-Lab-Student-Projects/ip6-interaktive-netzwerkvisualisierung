import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';
import type { LayoutProvider } from '../cytoscape-utils.ts';

/**
 * Cola (WebCola) constraint-based layout.
 * Handles compound nodes and cycles well.
 * Supports flow direction for hierarchical networks.
 * Good real network graphs with complex connectivity.
 * https://github.com/cytoscape/cytoscape.js-cola
 */
export const colaProvider: LayoutProvider = {
  register() {
    cytoscape.use(cola);
  },
  initial() {
    return {
      name: 'cola',
      animate: false,
      fit: true,
      padding: 40,
      maxSimulationTime: 6000,
      nodeSpacing: 60,
      avoidOverlap: true,
      handleDisconnected: true,
      flow: { axis: 'y', minSeparation: 80 },
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'cola',
      animate: true,
      animationDuration: 400,
      fit: false,
      maxSimulationTime: 2000,
      nodeSpacing: 60,
      avoidOverlap: true,
      handleDisconnected: true,
      flow: { axis: 'y', minSeparation: 80 },
    } as cytoscape.LayoutOptions;
  },
};
