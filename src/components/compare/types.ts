import type { DeviceInfoOutput, HostResponse } from '../../generated/types.gen.ts';
import { STALE_THRESHOLD_MS } from '../../network-styles.ts';

export interface CompareController {
  add: (nodeId: string, nodeType?: string) => void;
  has: (nodeId: string) => boolean;
  open: () => void;
  setLocate: (fn: (nodeId: string) => void) => void;
}

export type DeviceEntry = {
  id: string;
  nodeType: string;
  loading: boolean;
  data: DeviceInfoOutput | null;
  hostData: HostResponse | null;
  error: boolean;
};

export function getStatus(info: DeviceInfoOutput): 'online' | 'down' | 'unknown' {
  if (!info.known) return 'unknown';
  if (info.last_seen && Date.now() - info.last_seen * 1000 > STALE_THRESHOLD_MS) return 'down';
  return 'online';
}

export function val(v: string | null | undefined): string {
  return v ?? '—';
}
