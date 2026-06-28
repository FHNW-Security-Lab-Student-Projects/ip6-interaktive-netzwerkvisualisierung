import type cytoscape from 'cytoscape';
import { getDevice } from './generated/sdk.gen.ts';
import type { DeviceInfoOutput, SpanningTreeOutput } from './generated/types.gen.ts';
import type { BasegraphQuery } from './graph-loader.ts';
import { findPort, pairStatus, type ConnEntry } from './components/panel/edge/Connections.ts';
import { computeWarnings } from './components/panel/edge/rules.ts';

// NOTES: fetches per-device data to enrich edge state and type classes. Super inefficient and doesn't scale.
// This is a temporary client-side workaround. Edge state (down/disabled/warning)
// and type (lag, uplink, etc.) should be computed server-side and included in the
// basegraph API response.
export async function buildDeviceMap(
  nodeIds: string[],
  query: BasegraphQuery,
): Promise<Map<string, DeviceInfoOutput>> {
  const q = { explorer_network_id: query.networkId, snapshot_id: query.snapshotId };
  const results = await Promise.allSettled(
    nodeIds.map(id =>
      getDevice({ path: { device_id: id }, query: q }).then(r => ({ id, data: r.data?.data?.data ?? null })),
    ),
  );
  const map = new Map<string, DeviceInfoOutput>();
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.data) map.set(r.value.id, r.value.data);
  }
  return map;
}

function isStpBlocking(stp: SpanningTreeOutput | null | undefined, ifName: string): boolean {
  if (!stp?.instances) return false;
  for (const inst of Object.values(stp.instances)) {
    const iface = inst.interfaces?.find(i => i.if_no === ifName || i.if_no_short === ifName);
    if (iface?.state === 'Blocking') return true;
  }
  return false;
}

function classifyEdgeState(
  connEntries: ConnEntry[],
  srcInfo: DeviceInfoOutput | null,
  tgtInfo: DeviceInfoOutput | null,
): 'down' | 'disabled' | 'warning' | null {
  if (!connEntries.length) return null;

  const srcPorts = Object.values(srcInfo?.ports ?? {});
  const tgtPorts = Object.values(tgtInfo?.ports ?? {});

  const pairStatuses = connEntries.map(e =>
    pairStatus(findPort(srcPorts, e.ifLocal), findPort(tgtPorts, e.ifRemote)));

  if (pairStatuses.every(s => s === 'down')) return 'down';

  // STP blocking: port physically up but protocol-blocked — not broken, just not forwarding
  const stpBlocked = connEntries.some(e =>
    isStpBlocking(srcInfo?.stp, e.ifLocal) || isStpBlocking(tgtInfo?.stp, e.ifRemote));
  if (stpBlocked) return 'disabled';

  const warnings = computeWarnings(connEntries, srcPorts, tgtPorts);
  if (pairStatuses.some(s => s === 'down') || warnings.length > 0) return 'warning';

  return null;
}

function resolveConnEntries(
  srcInfo: DeviceInfoOutput | null,
  tgtInfo: DeviceInfoOutput | null,
  srcId: string,
  tgtId: string,
): ConnEntry[] {
  const srcConns = Object.values(srcInfo?.neighbors?.[tgtId]?.connections ?? {});
  if (srcConns.length) return srcConns.map(c => ({ ifLocal: c.if_local, ifRemote: c.if_remote }));
  const tgtConns = Object.values(tgtInfo?.neighbors?.[srcId]?.connections ?? {});
  return tgtConns.map(c => ({ ifLocal: c.if_remote, ifRemote: c.if_local }));
}

function isLagMember(info: DeviceInfoOutput | null, ifName: string): boolean {
  return Object.values(info?.lags ?? {}).some(lag => lag.members?.[ifName] !== undefined);
}

function isRoutedPort(info: DeviceInfoOutput | null, ifName: string): boolean {
  const port = findPort(Object.values(info?.ports ?? {}), ifName);
  return port?.port_type === 'routed';
}

const STATE_CLASSES = 'down disabled warning';

export function applyEdgeState(edge: cytoscape.EdgeSingular, deviceMap: Map<string, DeviceInfoOutput>): void {
  const srcId = (edge.data('orig_source') as string | undefined) ?? edge.source().id();
  const tgtId = (edge.data('orig_target') as string | undefined) ?? edge.target().id();

  // Node-type check runs regardless of device data — custom nodes may have no API data at all.
  // 'custom' endpoints (e.g. Uplink gateways) are non-standard infrastructure; show the edge
  // as logical (dashed) so it reads as "not a plain physical cable".
  const cy = edge.cy();
  const toCustomNode = cy.$id(srcId).data('node_type') === 'custom' || cy.$id(tgtId).data('node_type') === 'custom';

  const srcInfo = deviceMap.get(srcId) ?? null;
  const tgtInfo = deviceMap.get(tgtId) ?? null;

  let connEntries: ConnEntry[] = [];
  let stateClass: ReturnType<typeof classifyEdgeState> = null;
  let isLag = false;
  let isRouted = false;

  if (srcInfo || tgtInfo) {
    connEntries = resolveConnEntries(srcInfo, tgtInfo, srcId, tgtId);
    stateClass = classifyEdgeState(connEntries, srcInfo, tgtInfo);
    isLag = connEntries.some(e => isLagMember(srcInfo, e.ifLocal) || isLagMember(tgtInfo, e.ifRemote));
    isRouted = connEntries.some(e => isRoutedPort(srcInfo, e.ifLocal) || isRoutedPort(tgtInfo, e.ifRemote));
  }

  // NOTE: 'uplink' (redundant router uplink) cannot be inferred from per-device port data.
  // The basegraph API must include it in the edge 'classes' field.

  edge.removeClass(STATE_CLASSES);
  if (isLag && !edge.hasClass('lag')) edge.addClass('lag');
  if (isRouted && !edge.hasClass('routed')) edge.addClass('routed');
  if (toCustomNode && !edge.hasClass('lag') && !edge.hasClass('logical')) edge.addClass('logical');
  if (stateClass) edge.addClass(stateClass);
}

export function enrichEdges(cy: cytoscape.Core, deviceMap: Map<string, DeviceInfoOutput>): void {
  cy.edges().forEach(edge => applyEdgeState(edge, deviceMap));
}
