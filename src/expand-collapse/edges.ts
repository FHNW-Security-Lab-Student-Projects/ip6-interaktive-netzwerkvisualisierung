import cytoscape from 'cytoscape';
import type { AnyTypedNode, TypedCytoscapeEdge } from '../node-factory.ts';

// Returns the deepest visible ancestor of nodeId, or null. Used to lift edges into collapsed compounds.
export function getRepresentative(cy: cytoscape.Core, nodes: AnyTypedNode[], nodeId: string): string | null {
  if (cy.$id(nodeId).length > 0) return nodeId;
  const nodeData = nodes.find(n => n.data.id === nodeId)?.data;
  if (!nodeData?.parent) return null;
  return getRepresentative(cy, nodes, nodeData.parent);
}

// Rebuilds all edges: lifts endpoints inside collapsed compounds to their nearest visible ancestor,
// deduplicates, and skips parent<->child edges (implicit from containment).
// Must run outside cy.batch() so ancestor() lookups reflect committed state.
export function syncEdges(cy: cytoscape.Core, nodes: AnyTypedNode[], edges: TypedCytoscapeEdge[]): void {
  cy.edges().remove();
  const addedPairs = new Set<string>();
  edges.forEach(edge => {
    const repSrc = getRepresentative(cy, nodes, edge.data.source);
    const repTgt = getRepresentative(cy, nodes, edge.data.target);
    if (!repSrc || !repTgt || repSrc === repTgt) return;
    if (repSrc === edge.data.source && repTgt === edge.data.target) {
      const src = cy.$id(repSrc);
      const tgt = cy.$id(repTgt);
      if (src.ancestors().has(tgt) || tgt.ancestors().has(src)) return;
    }
    const pairKey = [repSrc, repTgt].sort().join('\0');
    if (addedPairs.has(pairKey)) return;
    addedPairs.add(pairKey);
    const isOriginal = repSrc === edge.data.source && repTgt === edge.data.target;
    const srcNodeData = nodes.find(n => n.data.id === edge.data.source)?.data as { device_type?: string } | undefined;
    const tgtNodeData = nodes.find(n => n.data.id === edge.data.target)?.data as { device_type?: string } | undefined;
    cy.add({
      data: {
        ...edge.data,
        id: isOriginal ? edge.data.id : `__lifted__${pairKey}`,
        source: repSrc,
        target: repTgt,
        ...(!isOriginal && {
          orig_source: edge.data.source,
          orig_target: edge.data.target,
          orig_source_device_type: srcNodeData?.device_type,
          orig_target_device_type: tgtNodeData?.device_type,
        }),
      },
      ...(edge.classes !== undefined ? { classes: edge.classes } : {}),
    } as cytoscape.ElementDefinition);
  });
}
