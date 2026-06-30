import type cytoscape from 'cytoscape';
import type { DeviceInfoOutput, PortInfo } from '../../generated/types.gen.ts';
import type { AccordionItem } from '../Accordion.ts';
import { createAccordion } from '../Accordion.ts';
import type { StatusLevel } from './utils.ts';
import { type ConnEntry, findPort, pairStatus, buildConnectionItems } from './edge/Connections.ts';
import { computeWarnings } from './edge/rules.ts';
import { buildVlansSection } from './edge/Vlans.ts';
import { buildStpSection } from './edge/Stp.ts';
import { buildEdgeHeader } from './edge/Header.ts';

const EDGE_TYPE_CLASSES = new Set(['logical', 'lag', 'uplink', 'routed']);

function computeStatus(
  connEntries: ConnEntry[],
  srcPorts: PortInfo[],
  tgtPorts: PortInfo[],
  warnings: string[],
): StatusLevel {
  if (connEntries.length > 0) {
    // Derive overall status from per-pair statuses so the header dot is always
    // consistent with what the individual accordion rows show.
    const pairStatuses = connEntries.map(entry =>
      pairStatus(findPort(srcPorts, entry.ifLocal), findPort(tgtPorts, entry.ifRemote)),
    );
    if (pairStatuses.every(s => s === 'down')) return 'down';
    if (pairStatuses.some(s => s === 'down')) return 'warn';
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
  stpInstanceKey?: string | null,
  macResolver?: (mac: string) => { id: string; name: string } | null,
): HTMLElement {
  const srcName = srcInfo?.name ?? (cy.$id(srcId).data('title') as string | undefined) ?? srcId;
  const tgtName = tgtInfo?.name ?? (cy.$id(tgtId).data('title') as string | undefined) ?? tgtId;
  const resolveNodeType = (nodeId: string, edgeFallback?: string): string => {
    const node = cy.$id(nodeId);
    if (node.length) {
      const deviceType = node.data('device_type') as string | undefined;
      if (deviceType) return deviceType;
      const nodeType = node.data('node_type') as string | undefined;
      if (nodeType === 'custom' || nodeType === 'host') return nodeType;
    }
    return edgeFallback ?? 'unknown';
  };
  const srcType = resolveNodeType(srcId, edge.data('orig_source_device_type') as string | undefined);
  const tgtType = resolveNodeType(tgtId, edge.data('orig_target_device_type') as string | undefined);

  const classes = edge.classes().filter(Boolean);
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
  const status = computeStatus(connEntries, srcPorts, tgtPorts, warnings);

  const header = buildEdgeHeader(
    srcId, srcName, srcType,
    tgtId, tgtName, tgtType,
    status, warnings,
    discoveredBySrc, discoveredByTgt,
    onNodeSelect,
  );

  const accordionItems: AccordionItem[] = buildConnectionItems(
    connEntries,
    srcId, srcName, srcPorts,
    tgtId, tgtName, tgtPorts,
    srcInfo, tgtInfo,
    typeClasses,
    openAccordions,
    onNodeSelect,
  );

  const vlansSection = buildVlansSection(srcId, srcName, tgtId, tgtName, connEntries, srcPorts, tgtPorts, onNodeSelect);
  accordionItems.push({
    label: 'VLANs', key: 'vlans', content: vlansSection.content,
    open: !vlansSection.disabled && openAccordions.has('vlans'),
    disabled: vlansSection.disabled,
  });

  const stpSection = buildStpSection(srcId, srcName, tgtId, tgtName, connEntries, srcInfo, tgtInfo, onNodeSelect, stpInstanceKey, macResolver);
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
