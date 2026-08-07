import type { AnyTypedNode, HierarchyLevel } from '../node-factory.ts';

export function getDirectChildren(nodes: AnyTypedNode[], nodeId: string): AnyTypedNode[] {
  return nodes.filter(n => n.data.parent === nodeId);
}

export function getAllDescendants(nodes: AnyTypedNode[], nodeId: string): AnyTypedNode[] {
  const direct = getDirectChildren(nodes, nodeId);
  return direct.flatMap(child => [child, ...getAllDescendants(nodes, child.data.id)]);
}

export function getInitialNodes(rootNodes: AnyTypedNode[], hierarchy?: HierarchyLevel[]): AnyTypedNode[] {
  if (!hierarchy || hierarchy.length === 0) return rootNodes;
  for (let i = 0; i < hierarchy.length; i++) {
    const atLevel = rootNodes.filter(n => hierarchy[i].matches(n.data));
    if (atLevel.length > 0) {
      // Also include root nodes that don't match this level or any higher level: they're standalone (e.g. switches in a graph that also has root-level routers).
      const coveredIds = new Set(
        rootNodes
          .filter(n => hierarchy.slice(0, i + 1).some(l => l.matches(n.data)))
          .map(n => n.data.id),
      );
      const standalone = rootNodes.filter(n => !coveredIds.has(n.data.id));
      return [...atLevel, ...standalone];
    }
  }
  return rootNodes;
}
