import cytoscape from 'cytoscape';
import d3Force from 'cytoscape-d3-force';
import type { LayoutProvider } from '../cytoscape-utils.ts';

/**
 * D3 force-directed layout.
 * Uses D3's force simulation:
 * link forces, charge repulsion, collision detection, and centering.
 * Highly configurable. Handles cycles and dense graphs without ring artifacts.
 * NOTE: Does not support compound nodes.
 * https://github.com/shichuanpo/cytoscape.js-d3-force
 */
export const d3ForceProvider: LayoutProvider = {
  register() {
    cytoscape.use(d3Force);
  },
  initial() {
    return {
      name: 'd3-force',
      animate: false,
      fit: true,
      padding: 40,
      linkId: (d: { id: string }) => d.id,
      linkDistance: 120,
      manyBodyStrength: -300,
      collideRadius: 40,
      collideStrength: 0.7,
    } as cytoscape.LayoutOptions;
  },
  expandCollapse() {
    return {
      name: 'd3-force',
      animate: true,
      animationDuration: 400,
      fit: false,
      linkId: (d: { id: string }) => d.id,
      linkDistance: 120,
      manyBodyStrength: -300,
      collideRadius: 40,
      collideStrength: 0.7,
    } as cytoscape.LayoutOptions;
  },
};
