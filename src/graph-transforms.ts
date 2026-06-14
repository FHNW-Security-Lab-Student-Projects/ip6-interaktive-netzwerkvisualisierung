import type { AnyTypedNode, TypedCytoscapeEdge, GroupNodeData } from './node-factory.ts';

export type GraphElements = {
  nodes: AnyTypedNode[];
  edges: TypedCytoscapeEdge[];
};

// groupByAttribute 
export type AttributeGroupingOptions = {
  matches: (node: AnyTypedNode) => boolean;
  keyOf: (node: AnyTypedNode) => string;
  groupLabel: (key: string) => string;
  minGroupSize?: number;  // default: 1
};

// Groups matched nodes under synthetic group nodes, one per distinct key value.
// Synthetic groups inherit the parent of their members (all members must be siblings).
export function groupByAttribute(
  nodes: AnyTypedNode[],
  edges: TypedCytoscapeEdge[],
  options: AttributeGroupingOptions,
): GraphElements {
  const { matches, keyOf, groupLabel, minGroupSize = 1 } = options;

  const toGroup = nodes.filter(matches);
  const rest = nodes.filter(n => !matches(n));

  const byKey = new Map<string, AnyTypedNode[]>();
  for (const node of toGroup) {
    const key = keyOf(node);
    const bucket = byKey.get(key) ?? [];
    bucket.push(node);
    byKey.set(key, bucket);
  }

  const syntheticGroups: AnyTypedNode[] = [];
  const regrouped: AnyTypedNode[] = [];

  for (const [key, members] of byKey.entries()) {
    if (members.length < minGroupSize) {
      regrouped.push(...members);
      continue;
    }

    const existingParent = members[0].data.parent;
    const groupId = `__synth_attr__${key.replace(/\W+/g, '_')}__${existingParent ?? 'root'}`;

    syntheticGroups.push({
      data: {
        id: groupId,
        title: groupLabel(key),
        label: groupLabel(key),
        node_type: 'group',
        ...(existingParent !== undefined ? { parent: existingParent } : {}),
      } as GroupNodeData,
    });

    for (const member of members) {
      regrouped.push({ ...member, data: { ...member.data, parent: groupId } });
    }
  }

  return { nodes: [...rest, ...syntheticGroups, ...regrouped], edges };
}

// groupByUpstreamNode 
export type UpstreamGroupingOptions = {
  isLeaf: (node: AnyTypedNode) => boolean;
  isUpstream: (node: AnyTypedNode) => boolean;
  minGroupSize?: number;  // default: 2
  // When true, leaves that fail minGroupSize are re-parented to the upstream node's parent
  // instead of being left as orphans — ensures every leaf ends up inside some compound.
  fallbackToUpstreamParent?: boolean;
};

// Re-parents leaf nodes under a directly connected upstream node, making it a compound.
// No synthetic nodes are created. Leaves with no upstream or below minGroupSize are unchanged.
export function groupByUpstreamNode(
  nodes: AnyTypedNode[],
  edges: TypedCytoscapeEdge[],
  options: UpstreamGroupingOptions,
): GraphElements {
  const { isLeaf, isUpstream, minGroupSize = 2, fallbackToUpstreamParent = false } = options;

  const leafIds = new Set(nodes.filter(isLeaf).map(n => n.data.id));
  const upstreamIds = new Set(nodes.filter(isUpstream).map(n => n.data.id));
  const nodeById = fallbackToUpstreamParent ? new Map(nodes.map(n => [n.data.id, n])) : null;

  // Map each leaf to its first upstream neighbour found in the edge list.
  const leafToUpstream = new Map<string, string>();
  for (const edge of edges) {
    const { source, target } = edge.data;
    if (leafIds.has(source) && upstreamIds.has(target) && !leafToUpstream.has(source)) {
      leafToUpstream.set(source, target);
    }
    if (leafIds.has(target) && upstreamIds.has(source) && !leafToUpstream.has(target)) {
      leafToUpstream.set(target, source);
    }
  }

  // Count leaves per upstream to apply minGroupSize filter.
  const upstreamLeafCount = new Map<string, number>();
  for (const upstreamId of leafToUpstream.values()) {
    upstreamLeafCount.set(upstreamId, (upstreamLeafCount.get(upstreamId) ?? 0) + 1);
  }

  return {
    nodes: nodes.map(node => {
      if (!leafIds.has(node.data.id)) return node;
      const upstreamId = leafToUpstream.get(node.data.id);
      if (!upstreamId) return node;
      if ((upstreamLeafCount.get(upstreamId) ?? 0) < minGroupSize) {
        if (fallbackToUpstreamParent) {
          const upstreamParent = nodeById!.get(upstreamId)?.data.parent;
          if (upstreamParent !== undefined) {
            return { ...node, data: { ...node.data, parent: upstreamParent } };
          }
        }
        return node;
      }
      return { ...node, data: { ...node.data, parent: upstreamId } };
    }),
    edges,
  };
}
