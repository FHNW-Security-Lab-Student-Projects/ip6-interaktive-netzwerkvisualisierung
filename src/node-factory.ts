import type { CytoscapeEdge, CytoscapeNode } from '@/generated/types.gen.ts';

export type NodeType   = "custom" | "device" | "group" | "host";
export type DeviceType = "router" | "switch" | "unknown";

type BaseNodeData = {
  id: string;
  title: string;
  label?: string;
  vendor?: string;
  parent?: string;
};

export type CustomNodeData = BaseNodeData & { node_type: "custom" };
export type DeviceNodeData = BaseNodeData & { node_type: "device"; device_type: DeviceType };
export type HostNodeData   = BaseNodeData & { node_type: "host" };
export type GroupNodeData  = BaseNodeData & { node_type: "group" };
export type NodeData       = CustomNodeData | DeviceNodeData | HostNodeData | GroupNodeData;

export type HierarchyLevel = {
  label: string;
  matches: (data: NodeData) => boolean;
};

// Ordered outermost -> innermost. Used by setupExpandCollapse to determine
// which nodes to show initially (first non-empty level among root nodes).
export const NODE_HIERARCHY: HierarchyLevel[] = [
  { label: 'group',  matches: d => d.node_type === 'group' },
  { label: 'router', matches: d => d.node_type === 'device' && (d as DeviceNodeData).device_type === 'router' },
  { label: 'switch', matches: d => d.node_type === 'device' && (d as DeviceNodeData).device_type === 'switch' },
  { label: 'leaf',   matches: d => d.node_type === 'host' || d.node_type === 'custom' || (d.node_type === 'device' && (d as DeviceNodeData).device_type === 'unknown') },
];

export type TypedCytoscapeNode<T extends NodeData> = Omit<CytoscapeNode, 'data'> & { data: T };
export type AnyTypedNode = TypedCytoscapeNode<NodeData>;

type BaseParams = {
  id: string;
  title: string;
  label: string;
  vendor?: string;
  parent?: AnyTypedNode;
  classes?: CytoscapeNode['classes'];
};

export function createCustomNode(params: BaseParams): TypedCytoscapeNode<CustomNodeData> {
  return buildNode({ ...params, node_type: "custom" });
}

export function createHostNode(params: BaseParams): TypedCytoscapeNode<HostNodeData> {
  return buildNode({ ...params, node_type: "host" });
}

export function createGroupNode(params: BaseParams): TypedCytoscapeNode<GroupNodeData> {
  return buildNode({ ...params, node_type: "group" });
}

export function createDeviceNode(params: BaseParams & { device_type: DeviceType }): TypedCytoscapeNode<DeviceNodeData> {
  return buildNode({ ...params, node_type: "device" });
}

export type EdgeData = {
  id: string;
  source: string;
  target: string;
  label?: string;
  color?: string;
  redundancy?: number;
};

export type TypedCytoscapeEdge = Omit<CytoscapeEdge, 'data'> & { data: EdgeData };

type CreateEdgeParams = {
  source: AnyTypedNode;
  target: AnyTypedNode;
  label?: string;
  color?: string;
  redundancy?: number;
  classes?: CytoscapeEdge['classes'];
};

export function createEdge(params: CreateEdgeParams): TypedCytoscapeEdge {
  const { source, target, classes, ...rest } = params;
  return {
    data: {
      id: `${source.data.id}-${target.data.id}`,
      source: source.data.id,
      target: target.data.id,
      ...rest,
    },
    ...(classes !== undefined ? { classes } : {}),
  };
}

function buildNode<T extends NodeData>(
  params: Omit<BaseParams, 'parent'> & { parent?: AnyTypedNode; node_type: string; device_type?: DeviceType },
): TypedCytoscapeNode<T> {
  const { parent, classes, ...rest } = params;
  return {
    data: {
      ...rest,
      ...(parent ? { parent: parent.data.id } : {}),
    } as T,
    ...(classes !== undefined ? { classes } : {}),
  };
}
