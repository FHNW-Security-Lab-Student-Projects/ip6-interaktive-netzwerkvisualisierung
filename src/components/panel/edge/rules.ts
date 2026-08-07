import type { IpConfigInfo, PortInfo } from '../../../generated/types.gen.ts';
import { findPort, type ConnEntry } from './Connections.ts';
import { normalizeVlanId } from '../normalize.ts';

// A rule inspects one connection pair and returns a warning string, or null if healthy.
type WarningRule = (entry: ConnEntry, sp: PortInfo | undefined, tp: PortInfo | undefined) => string | null;

export const ACCESS_TRUNK = new Set(['access', 'trunk']);

// Check for type mismatches between connected ports, e.g. trunk vs access.
// Routed ports are a distinct operating mode and are not compared against access/trunk.
const typeMismatch: WarningRule = (entry, sp, tp) => {
  if (
    sp?.port_type && tp?.port_type &&
    ACCESS_TRUNK.has(sp.port_type) && ACCESS_TRUNK.has(tp.port_type) &&
    sp.port_type !== tp.port_type
  ) {
    return `Type mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}: ${sp.port_type} / ${tp.port_type}`;
  }
  return null;
};

// Check for asymmetric interface states, e.g. one side is up while the other is down
const asymmetricState: WarningRule = (entry, sp, tp) => {
  if (sp?.if_state && tp?.if_state && sp.if_state !== tp.if_state) {
    return `Asymmetric state on ${entry.ifLocal} ↔ ${entry.ifRemote}: ${sp.if_state} / ${tp.if_state}`;
  }
  return null;
};

// Check for tagged VLAN mismatches between connected ports
const taggedVlanMismatch: WarningRule = (entry, sp, tp) => {
  const a = sp?.tagged || null;
  const b = tp?.tagged || null;
  if ((a !== null || b !== null) && a !== b) {
    return `Tagged VLAN mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}`;
  }
  return null;
};

// Check for native VLAN mismatches between connected ports.
// Only meaningful on trunk ports — access and routed ports don't use native VLANs.
const nativeVlanMismatch: WarningRule = (entry, sp, tp) => {
  if (sp?.port_type !== 'trunk' || tp?.port_type !== 'trunk') return null;
  const a = normalizeVlanId(sp?.untagged) ?? normalizeVlanId(sp?.vlan_id) ?? null;
  const b = normalizeVlanId(tp?.untagged) ?? normalizeVlanId(tp?.vlan_id) ?? null;
  if ((a !== null || b !== null) && a !== b) {
    return `Native VLAN mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}`;
  }
  return null;
};

// Skip "auto" and "unknown" — only flag when both sides have negotiated to explicit, differing values.
const speedMismatch: WarningRule = (entry, sp, tp) => {
  const a = sp?.speed;
  const b = tp?.speed;
  const known = (v: string | null | undefined) => v && v !== 'auto' && v !== 'unknown';
  if (known(a) && known(b) && a !== b) {
    return `Speed mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}: ${a} / ${b}`;
  }
  return null;
};

// Half/full duplex mismatch causes high collision rates and poor throughput.
const duplexMismatch: WarningRule = (entry, sp, tp) => {
  const a = sp?.duplex;
  const b = tp?.duplex;
  const known = (v: string | null | undefined) => v && v !== 'auto' && v !== 'unknown';
  if (known(a) && known(b) && a !== b) {
    return `Duplex mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}: ${a} / ${b}`;
  }
  return null;
};

// err-disabled means the port was shut down by the switch due to a policy violation. It will not recover without manual intervention.
const errDisabled: WarningRule = (entry, sp, tp) => {
  const affected = [
    sp?.if_state === 'err-disabled' ? entry.ifLocal : null,
    tp?.if_state === 'err-disabled' ? entry.ifRemote : null,
  ].filter(Boolean);
  return affected.length > 0 ? `err-disabled: ${affected.join(', ')}` : null;
};

export const WARNING_RULES: WarningRule[] = [
  typeMismatch,
  asymmetricState,
  speedMismatch,
  duplexMismatch,
  errDisabled,
  taggedVlanMismatch,
  nativeVlanMismatch,
];

export function networkAddress(cidr: string): string | null {
  const slash = cidr.indexOf('/');
  if (slash === -1) return null;
  const prefix = parseInt(cidr.slice(slash + 1), 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
  const parts = cidr.slice(0, slash).split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const net = (ipNum & mask) >>> 0;
  return `${net >>> 24}.${(net >> 16) & 255}.${(net >> 8) & 255}.${net & 255}/${prefix}`;
}

function checkRoutedSubnets(
  entry: ConnEntry,
  srcIpConfigs: Record<string, IpConfigInfo>,
  tgtIpConfigs: Record<string, IpConfigInfo>,
): string | null {
  const srcCidrs = srcIpConfigs[entry.ifLocal]?.ip_interfaces ?? [];
  const tgtCidrs = tgtIpConfigs[entry.ifRemote]?.ip_interfaces ?? [];
  if (!srcCidrs.length || !tgtCidrs.length) return null;
  const srcNets = srcCidrs.map(networkAddress).filter((n): n is string => n !== null);
  const tgtNets = tgtCidrs.map(networkAddress).filter((n): n is string => n !== null);
  if (!srcNets.length || !tgtNets.length) return null;
  if (!srcNets.some(n => tgtNets.includes(n))) {
    return `Subnet mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}: ${srcCidrs.join(', ')} / ${tgtCidrs.join(', ')}`;
  }
  return null;
}

export function computeWarnings(
  connEntries: ConnEntry[],
  srcPorts: PortInfo[],
  tgtPorts: PortInfo[],
  srcIpConfigs?: Record<string, IpConfigInfo>,
  tgtIpConfigs?: Record<string, IpConfigInfo>,
): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const entry of connEntries) {
    const sp = findPort(srcPorts, entry.ifLocal);
    const tp = findPort(tgtPorts, entry.ifRemote);
    for (const rule of WARNING_RULES) {
      const w = rule(entry, sp, tp);
      if (w && !seen.has(w)) { seen.add(w); warnings.push(w); }
    }
    if (sp?.port_type === 'routed' && tp?.port_type === 'routed' && srcIpConfigs && tgtIpConfigs) {
      const w = checkRoutedSubnets(entry, srcIpConfigs, tgtIpConfigs);
      if (w && !seen.has(w)) { seen.add(w); warnings.push(w); }
    }
  }
  return warnings;
}
