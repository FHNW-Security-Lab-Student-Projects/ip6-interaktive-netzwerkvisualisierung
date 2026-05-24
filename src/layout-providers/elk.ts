import cytoscape from 'cytoscape';
import elk from 'cytoscape-elk';
import type { LayoutProvider } from '../layout-utils.ts';

function register() {
  cytoscape.use(elk);
}

const elkLayered = {
  algorithm: 'layered',
  'elk.direction': 'DOWN',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
};

/**
 * ELK layered (hierarchical) layout.
 * Best for DAG-like networks with clear top-down structure and no cycles.
 * Cycles cause a ring/arc artifact, use elkStressProvider for graphs with redundant links.
 * https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-layered.html
 */
export const elkLayeredProvider: LayoutProvider = {
  register,
  initial() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      padding: 40,
      animate: false,
      elk: elkLayered,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: false,
      animate: true,
      animationDuration: 400,
      elk: elkLayered,
    } as cytoscape.LayoutOptions;
  },
};

const elkMrtree = {
  algorithm: 'mrtree',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
};

/**
 * ELK mrtree (minimal routing tree) layout.
 * Produces a clean top-down tree. Best when the expanded subgraph is truly
 * tree-structured (no cross-connections between siblings). Fails gracefully
 * on cycles by picking a spanning tree.
 * https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-mrtree.html
 */
export const elkMrtreeProvider: LayoutProvider = {
  register,
  initial() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      padding: 40,
      animate: false,
      elk: elkMrtree,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: false,
      animate: true,
      animationDuration: 400,
      elk: elkMrtree,
    } as cytoscape.LayoutOptions;
  },
};

const elkForce = {
  algorithm: 'force',
  'elk.spacing.nodeNode': '80',
  'elk.force.iterations': '500',
};

/**
 * ELK force (spring-embedder) layout.
 * Handles cycles, different repulsion model from fcose.
 * https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-force.html
 */
export const elkForceProvider: LayoutProvider = {
  register,
  initial() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      padding: 40,
      animate: false,
      elk: elkForce,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: false,
      animate: true,
      animationDuration: 400,
      elk: elkForce,
    } as cytoscape.LayoutOptions;
  },
};

const elkStress = {
  algorithm: 'stress',
  'elk.stress.desiredEdgeLength': '120',
  'elk.spacing.nodeNode': '60',
};

/**
 * ELK stress (stress-majorization) layout.
 * Handles cycles correctly, positions nodes so graph-theoretic distances match
 * Euclidean distances. Use for real network graphs with redundant links.
 * https://www.eclipse.org/elk/reference/algorithms/org-eclipse-elk-stress.html
 */
export const elkStressProvider: LayoutProvider = {
  register,
  initial() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: true,
      padding: 40,
      animate: false,
      elk: elkStress,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'elk',
      nodeDimensionsIncludeLabels: true,
      fit: false,
      animate: true,
      animationDuration: 400,
      elk: elkStress,
    } as cytoscape.LayoutOptions;
  },
};
