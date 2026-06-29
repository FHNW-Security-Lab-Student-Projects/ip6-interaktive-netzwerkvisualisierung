import type { SpanningTreeInstanceOutput } from '../../generated/types.gen.ts';
import { makeNodeName, makeTextEl } from './utils.ts';

export type StpEntry = { key: string; label: string; protocol: string };

// NOTE: Resolution via MAC can fail when two devices share the same synthetic bridge_address
// (e.g. MikroTik CHR VMs on the same host). In that case the resolver returns null and we
// fall back to a copyable raw MAC. The proper fix is for the backend to include a device ID
// alongside root_address in SpanningTreeInstanceOutput.
export function makeRootBridgeEl(
  inst: SpanningTreeInstanceOutput | null | undefined,
  ownId: string | undefined,
  ownName: string | undefined,
  resolve: ((mac: string) => { id: string; name: string } | null) | undefined,
  onSelect?: (id: string) => void,
): HTMLElement {
  const rootMac = inst?.root_address?.address;
  if (!rootMac) return makeTextEl('—');
  // Self-root check first: immune to MAC collisions between devices sharing synthetic bridge MACs
  if (ownId && ownName && inst?.bridge_address?.address === rootMac) {
    return makeNodeName(ownName, ownId, onSelect);
  }
  const device = resolve?.(rootMac);
  if (device) return makeNodeName(device.name, device.id, onSelect);
  return makeTextEl(rootMac, { copy: rootMac });
}

// Builds a header row: protocol chip (when all instances share one known protocol) +
// instance <select> with <optgroup> grouping when multiple protocols coexist.
// Returns the element and the effective initial key (may differ from defaultKey
// if defaultKey is absent from entries).
export function buildStpControls(
  entries: StpEntry[],
  defaultKey: string | null,
  onChange: (key: string | null) => void,
): { el: HTMLElement; initialKey: string | null } {
  const el = document.createElement('div');
  el.className = 'stp-section-header';

  const initialKey = (defaultKey && entries.some(e => e.key === defaultKey))
    ? defaultKey
    : null;

  if (entries.length >= 1) {
    const select = document.createElement('select');
    select.className = 'stp-instance-select';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'None';
    if (initialKey === null) noneOpt.selected = true;
    select.append(noneOpt);

    const byProto = new Map<string, StpEntry[]>();
    for (const e of entries) {
      if (!byProto.has(e.protocol)) byProto.set(e.protocol, []);
      byProto.get(e.protocol)!.push(e);
    }
    for (const [proto, group] of byProto) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = proto;
      for (const { key, label } of group) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = label;
        if (key === initialKey) opt.selected = true;
        optgroup.append(opt);
      }
      select.append(optgroup);
    }

    select.addEventListener('change', () => onChange(select.value || null));
    el.append(select);
  }

  return { el, initialKey };
}
