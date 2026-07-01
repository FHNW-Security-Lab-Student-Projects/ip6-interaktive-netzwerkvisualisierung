// NOTE: This normalization should obviously be done in the backend. Consider this a workaround for the prototypes.
export function normalizeStr(v: string | null | undefined): string | null {
  return v || null;
}

// VLAN 0 is the IEEE 802.1Q reserved value meaning "unassigned".
// Treat it the same as null so display and mismatch logic agree.
export function normalizeVlanId(v: number | null | undefined): number | null {
  if (v == null || v === 0) return null;
  return v;
}
