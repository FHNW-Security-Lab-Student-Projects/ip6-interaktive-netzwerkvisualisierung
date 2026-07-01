import type { AnyTypedNode, DeviceNodeData } from '../../node-factory.ts';
import { createAccordion } from '../Accordion.ts';
import type { AccordionItem } from '../Accordion.ts';
import { makeChip, makeNodeName } from './utils.ts';

const TYPE_ORDER = ['router', 'switch', 'unknown', 'group', 'host', 'custom'] as const;

const TYPE_LABELS: Record<string, string> = {
  router: 'Routers',
  switch: 'Switches',
  unknown: 'Devices',
  group: 'Groups',
  host: 'Hosts',
  custom: 'Custom',
};

function nodeTypeKey(node: AnyTypedNode): string {
  if (node.data.node_type === 'device') return (node.data as DeviceNodeData).device_type ?? 'unknown';
  return node.data.node_type;
}

function buildTypeContent(members: AnyTypedNode[], onNodeSelect?: (nodeId: string) => void): HTMLElement {
  const content = document.createElement('div');
  for (const member of members) {
    const row = document.createElement('div');
    row.className = 'group-member-row';
    const name = member.data.label ?? member.data.title ?? member.data.id;
    row.append(makeNodeName(name, member.data.id, onNodeSelect));
    content.append(row);
  }
  return content;
}

export function buildGroupPanelEl(
  label: string,
  children: AnyTypedNode[],
  openAccordions: Set<string>,
  onToggle: (key: string, isOpen: boolean) => void,
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const wrapper = document.createElement('div');

  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';

  const heroRow = document.createElement('div');
  heroRow.className = 'panel-hero-row';
  const nameEl = document.createElement('span');
  nameEl.className = 'panel-device-name';
  nameEl.textContent = label;
  nameEl.title = label;
  heroRow.append(nameEl);
  header.append(heroRow);

  const chips = document.createElement('div');
  chips.className = 'panel-chips-row';
  chips.append(makeChip('group'));
  header.append(chips);

  wrapper.append(header);

  // One accordion section per type
  const byType = new Map<string, AnyTypedNode[]>();
  for (const child of children) {
    const key = nodeTypeKey(child);
    const bucket = byType.get(key) ?? [];
    bucket.push(child);
    byType.set(key, bucket);
  }

  const orderedKeys = [
    ...TYPE_ORDER.filter(k => byType.has(k)),
    ...[...byType.keys()].filter(k => !(TYPE_ORDER as readonly string[]).includes(k)),
  ];

  const items: AccordionItem[] = orderedKeys.map(key => {
    const members = byType.get(key)!;
    const typeLabel = TYPE_LABELS[key] ?? key;
    const sectionLabel = `${typeLabel} (${members.length})`;
    return {
      label: sectionLabel,
      key: typeLabel,
      content: buildTypeContent(members, onNodeSelect),
      open: openAccordions.has(typeLabel),
    };
  });

  if (items.length === 0) {
    items.push({
      label: 'Members',
      key: 'Members',
      content: (() => { const el = document.createElement('div'); el.className = 'section-empty'; el.textContent = 'No members'; return el; })(),
      disabled: true,
    });
  }

  const accordion = createAccordion(items);

  accordion.querySelectorAll<HTMLButtonElement>('.accordion-header:not([disabled])').forEach((btn, i) => {
    const enabledItems = items.filter(it => !it.disabled);
    const key = enabledItems[i]?.key ?? String(i);
    btn.addEventListener('click', () => {
      onToggle(key, btn.getAttribute('aria-expanded') === 'true');
    });
  });

  const sections = document.createElement('div');
  sections.className = 'panel-sections';
  sections.append(accordion);
  wrapper.append(sections);

  return wrapper;
}
