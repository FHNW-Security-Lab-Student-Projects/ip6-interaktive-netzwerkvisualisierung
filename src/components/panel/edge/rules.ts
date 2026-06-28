import type { PortInfo } from '../../../generated/types.gen.ts';
import { findPort, type ConnEntry } from './Connections.ts';

// A rule inspects one connection pair and returns a warning string, or null if healthy.
type WarningRule = (entry: ConnEntry, sp: PortInfo | undefined, tp: PortInfo | undefined) => string | null;

// Check for type mismatches between connected ports, e.g. trunk vs access
const typeMismatch: WarningRule = (_, sp, tp) => {
  if (
    sp?.port_type && tp?.port_type &&
    sp.port_type !== 'unknown' && tp.port_type !== 'unknown' &&
    sp.port_type !== tp.port_type
  ) {
    return `Type mismatch: ${sp.port_type} / ${tp.port_type}`;
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
  const a = sp?.tagged ?? null;
  const b = tp?.tagged ?? null;
  if ((a !== null || b !== null) && a !== b) {
    return `Tagged VLAN mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}`;
  }
  return null;
};

// Check for native VLAN mismatches between connected ports
const nativeVlanMismatch: WarningRule = (entry, sp, tp) => {
  const a = sp?.untagged ?? sp?.vlan_id ?? null;
  const b = tp?.untagged ?? tp?.vlan_id ?? null;
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

export function computeWarnings(
  connEntries: ConnEntry[],
  srcPorts: PortInfo[],
  tgtPorts: PortInfo[],
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
  }
  return warnings;
}
