import { getBasegraph, getDevices } from './generated/sdk.gen.ts';
import type { AnyTypedNode, TypedCytoscapeEdge } from './node-factory.ts';
import type { DeviceInfoOutput } from './generated/types.gen.ts';

export type BasegraphQuery = {
  networkId: number;
  snapshotId: number;
};

export type BasegraphData = {
  nodes: AnyTypedNode[];
  edges: TypedCytoscapeEdge[];
};

export async function loadBasegraph(query: BasegraphQuery): Promise<BasegraphData> {
  const { data, error } = await getBasegraph({
    query: {
      data_type: 'all',
      explorer_network_id: query.networkId,
      snapshot_id: query.snapshotId,
    },
  });

  if (error || !data?.data?.graph) {
    throw new Error(`Failed to load graph: ${JSON.stringify(error)}`);
  }

  const elements = (data.data.graph as { elements?: { nodes?: unknown[]; edges?: unknown[] } }).elements ?? {};

  const nodes = (elements.nodes ?? []).map((node: unknown) => {
    const n = node as { data?: Record<string, unknown>; classes?: string };
    // Rename API field dev_type to device_type used by local types
    const { dev_type, ...rest } = (n.data ?? {}) as Record<string, unknown> & { dev_type?: unknown };
    const rawLabel = rest['label'] as string | undefined;
    const label = (rest['node_type'] === 'host' && rawLabel?.includes('\n'))
      ? rawLabel.split('\n').reverse().join('\n')
      : rawLabel;
    return {
      data: {
        ...rest,
        ...(label !== undefined ? { label } : {}),
        ...(dev_type !== undefined ? { device_type: dev_type } : {}),
        title: (rest['title'] ?? label ?? rest['id']) as string,
      },
      ...(n.classes !== undefined ? { classes: n.classes } : {}),
    };
  }) as AnyTypedNode[];

  const edges = (elements.edges ?? []).map((edge: unknown) => {
    const e = edge as { data?: Record<string, unknown>; classes?: string };
    return {
      data: { ...(e.data ?? {}) },
      ...(e.classes !== undefined ? { classes: e.classes } : {}),
    };
  }) as TypedCytoscapeEdge[];

  return { nodes, edges };
}

// Returns a map of device id -> DeviceInfoOutput for enriching search.
// Indexes by all three candidate ID fields so callers don't need to know
// which one the basegraph node uses as its id.
export async function loadDeviceInfo(query: BasegraphQuery): Promise<Map<string, DeviceInfoOutput>> {
  const { data } = await getDevices({
    query: { explorer_network_id: query.networkId, snapshot_id: query.snapshotId },
  });
  const map = new Map<string, DeviceInfoOutput>();
  for (const d of data?.data ?? []) {
    map.set(d.unique_id, d.data);
    if (d.data.id) map.set(d.data.id, d.data);
    map.set(String(d.id), d.data);
  }
  return map;
}
