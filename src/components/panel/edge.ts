import type cytoscape from 'cytoscape';
import type { DeviceInfoOutput, PortInfo } from '../../generated/types.gen.ts';
import type { AccordionItem } from '../Accordion.ts';
import { createAccordion } from '../Accordion.ts';
import type { StatusLevel } from './utils.ts';
import { type ConnEntry, findPort, buildConnectionItems } from './edge/Connections.ts';
import { buildVlansSection } from './edge/Vlans.ts';
import { buildStpSection } from './edge/Stp.ts';
import { buildEdgeHeader } from './edge/Header.ts';

const EDGE_TYPE_CLASSES = new Set(['logical', 'lagg', 'uplink', 'routed']);

function computeWarnings(connEntries: ConnEntry[], srcPorts: PortInfo[], tgtPorts: PortInfo[]): string[] {
  const warnings: string[] = [];
  const seenTypeMismatch = new Set<string>();

  for (const entry of connEntries) {
    const sp = findPort(srcPorts, entry.ifLocal);
    const tp = findPort(tgtPorts, entry.ifRemote);

    if (
      sp?.port_type && tp?.port_type &&
      sp.port_type !== 'unknown' && tp.port_type !== 'unknown' &&
      sp.port_type !== tp.port_type
    ) {
      const key = `${sp.port_type}/${tp.port_type}`;
      if (!seenTypeMismatch.has(key)) {
        seenTypeMismatch.add(key);
        warnings.push(`Type mismatch: ${sp.port_type} / ${tp.port_type}`);
      }
    }

    if (sp?.if_state && tp?.if_state && sp.if_state !== tp.if_state) {
      warnings.push(`Asymmetric state on ${entry.ifLocal} ↔ ${entry.ifRemote}: ${sp.if_state} / ${tp.if_state}`);
    }

    const spTagged = sp?.tagged ?? null;
    const tpTagged = tp?.tagged ?? null;
    if ((spTagged !== null || tpTagged !== null) && spTagged !== tpTagged) {
      warnings.push(`Tagged VLAN mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}`);
    }

    const spNative = sp?.untagged ?? sp?.vlan_id ?? null;
    const tpNative = tp?.untagged ?? tp?.vlan_id ?? null;
    if ((spNative !== null || tpNative !== null) && spNative !== tpNative) {
      warnings.push(`Native VLAN mismatch on ${entry.ifLocal} ↔ ${entry.ifRemote}`);
    }
  }

  return warnings;
}

function computeStatus(
  connEntries: ConnEntry[],
  srcPorts: PortInfo[],
  tgtPorts: PortInfo[],
  edgeIsDown: boolean,
  warnings: string[],
): StatusLevel {
  if (edgeIsDown) return 'down';

  if (connEntries.length > 0) {
    const allDown = connEntries.every(entry => {
      const sp = findPort(srcPorts, entry.ifLocal);
      const tp = findPort(tgtPorts, entry.ifRemote);
      return sp?.if_state === 'down' && tp?.if_state === 'down';
    });
    if (allDown) return 'down';
  }

  if (warnings.length > 0) return 'warn';
  return 'online';
}

export function buildEdgePanel(
  edge: cytoscape.EdgeSingular,
  cy: cytoscape.Core,
  srcId: string,
  tgtId: string,
  srcInfo: DeviceInfoOutput | null,
  tgtInfo: DeviceInfoOutput | null,
  openAccordions: Set<string>,
  onToggle: (key: string, isOpen: boolean) => void,
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const srcName = srcInfo?.name ?? (cy.$id(srcId).data('title') as string | undefined) ?? srcId;
  const tgtName = tgtInfo?.name ?? (cy.$id(tgtId).data('title') as string | undefined) ?? tgtId;
  const srcType = (cy.$id(srcId).data('device_type') as string | undefined)
    ?? (edge.data('orig_source_device_type') as string | undefined)
    ?? 'unknown';
  const tgtType = (cy.$id(tgtId).data('device_type') as string | undefined)
    ?? (edge.data('orig_target_device_type') as string | undefined)
    ?? 'unknown';

  const classes = edge.classes().filter(Boolean);
  const edgeIsDown = classes.includes('down') || classes.includes('disabled');
  const typeClasses = classes.filter(c => EDGE_TYPE_CLASSES.has(c));

  const discoveredBySrc = !!srcInfo?.neighbors?.[tgtId];
  const discoveredByTgt = !!tgtInfo?.neighbors?.[srcId];

  const connEntries: ConnEntry[] = [];
  const srcNeighbor = srcInfo?.neighbors?.[tgtId];
  for (const conn of Object.values(srcNeighbor?.connections ?? {})) {
    connEntries.push({ ifLocal: conn.if_local, ifRemote: conn.if_remote });
  }
  if (connEntries.length === 0) {
    const tgtNeighbor = tgtInfo?.neighbors?.[srcId];
    for (const conn of Object.values(tgtNeighbor?.connections ?? {})) {
      connEntries.push({ ifLocal: conn.if_remote, ifRemote: conn.if_local });
    }
  }

  const srcPorts = Object.values(srcInfo?.ports ?? {});
  const tgtPorts = Object.values(tgtInfo?.ports ?? {});

  const warnings = computeWarnings(connEntries, srcPorts, tgtPorts);
  const status = computeStatus(connEntries, srcPorts, tgtPorts, edgeIsDown, warnings);

  const header = buildEdgeHeader(
    srcId, srcName, srcType,
    tgtId, tgtName, tgtType,
    status, warnings,
    discoveredBySrc, discoveredByTgt,
    typeClasses,
    onNodeSelect,
  );

  const accordionItems: AccordionItem[] = buildConnectionItems(
    connEntries,
    srcId, srcName, srcPorts,
    tgtId, tgtName, tgtPorts,
    srcInfo, tgtInfo,
    openAccordions,
    onNodeSelect,
  );

  const vlansSection = buildVlansSection(srcName, tgtName, connEntries, srcPorts, tgtPorts);
  accordionItems.push({
    label: 'VLANs', key: 'vlans', content: vlansSection.content,
    open: !vlansSection.disabled && openAccordions.has('vlans'),
    disabled: vlansSection.disabled,
  });

  const stpSection = buildStpSection(srcName, tgtName, connEntries, srcInfo, tgtInfo);
  accordionItems.push({
    label: 'Spanning Tree', key: 'stp', content: stpSection.content,
    open: !stpSection.disabled && openAccordions.has('stp'),
    disabled: stpSection.disabled,
  });

  const wrapper = document.createElement('div');
  wrapper.append(header);

  if (accordionItems.length > 0) {
    const sections = document.createElement('div');
    sections.className = 'panel-sections';
    const accordion = createAccordion(accordionItems);

    const buttons = accordion.querySelectorAll<HTMLButtonElement>('.accordion-header:not([disabled])');
    buttons.forEach((btn, i) => {
      const enabledItems = accordionItems.filter(it => !it.disabled);
      const key = enabledItems[i]?.key ?? String(i);
      btn.addEventListener('click', () => {
        const isNowOpen = btn.getAttribute('aria-expanded') === 'true';
        onToggle(key, isNowOpen);
      });
    });

    sections.append(accordion);
    wrapper.append(sections);
  }

  return wrapper;
}
