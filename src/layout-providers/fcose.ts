import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { LayoutProvider } from '../layout-utils.ts';

function register() {
  cytoscape.use(fcose);
}

/**
 * fcose layout for small-to-medium graphs and hand-crafted examples.
 * https://github.com/iVis-at-Bilkent/cytoscape.js-fcose
 */
export const fcoseProvider: LayoutProvider = {
  register,
  initial() {
    return {
      name: 'fcose',
      animate: false,
      quality: 'proof',
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 120,
      nodeSeparation: 75,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'fcose',
      animate: true,
      animationDuration: 400,
      quality: 'proof',
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 120,
      nodeSeparation: 75,
    } as cytoscape.LayoutOptions;
  },
};

/**
 * fcose layout tuned for large compound graphs with many siblings per group.
 * Increases edge length and node separation to prevent the ring/pile artifact
 * that appears when many equidistant leaf nodes are in one compound.
 */
export const fcoseLargeProvider: LayoutProvider = {
  register,
  initial() {
    return {
      name: 'fcose',
      animate: false,
      quality: 'proof',
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 250,
      nodeSeparation: 150,
      packComponents: true,
      gravityCompound: 0.5,
      gravityRangeCompound: 1.5,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'fcose',
      animate: true,
      animationDuration: 400,
      quality: 'proof',
      nodeDimensionsIncludeLabels: true,
      idealEdgeLength: 250,
      nodeSeparation: 250,
      nodeRepulsion: 45000,
      gravityCompound: 0.2,
      gravityRangeCompound: 1.5,
    } as cytoscape.LayoutOptions;
  },
};
