import { getDevice, getHost } from '../../generated/sdk.gen.ts';
import type { DeviceEntry } from './types.ts';

// Loads device/host data for an entry, mutating it in place (loading/error/data/hostData).
export async function loadEntry(
  entry: DeviceEntry,
  opts?: { networkId?: number; snapshotId?: number },
): Promise<void> {
  const query = { explorer_network_id: opts?.networkId, snapshot_id: opts?.snapshotId };
  try {
    if (entry.nodeType === 'host') {
      const { data, error } = await getHost({ path: { host_id: entry.id }, query });
      entry.loading = false;
      if (error || !data?.data) { entry.error = true; }
      else { entry.hostData = data.data; }
    } else {
      const { data, error } = await getDevice({ path: { device_id: entry.id }, query });
      entry.loading = false;
      if (error || !data?.data?.data) { entry.error = true; }
      else { entry.data = data.data.data; }
    }
  } catch {
    entry.loading = false;
    entry.error = true;
  }
}
