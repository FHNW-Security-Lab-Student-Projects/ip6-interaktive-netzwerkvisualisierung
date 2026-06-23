import type { DeviceInfoOutput } from '../../generated/types.gen.ts';
import { createAccordion } from '../Accordion.ts';
import { buildNeighborsSection } from './sections/Neighbors.ts';
import { buildPortsSection } from './sections/Ports.ts';
import { buildLagsSection } from './sections/Lags.ts';
import { buildSpanningTreeSection } from './sections/SpanningTree.ts';
import { buildVlansSection } from './sections/Vlans.ts';
import { buildVrfsSection } from './sections/Vrfs.ts';
import { buildIpConfigsSection } from './sections/IpConfigs.ts';
import { buildRoutesSection } from './sections/Routes.ts';

export function buildSections(
  info: DeviceInfoOutput,
  openAccordions: Set<string>,
  onToggle: (label: string, isOpen: boolean) => void,
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'panel-sections';

  const panels = [
    buildNeighborsSection(info, onNodeSelect),
    buildPortsSection(info),
    buildLagsSection(info),
    buildSpanningTreeSection(info),
    buildVlansSection(info),
    buildVrfsSection(info),
    buildIpConfigsSection(info),
    buildRoutesSection(info),
  ];

  const items = panels.map(s => ({
    ...s,
    open: !s.disabled && openAccordions.has(s.label),
  }));

  const accordion = createAccordion(items);

  accordion.querySelectorAll<HTMLButtonElement>('.accordion-header:not([disabled])').forEach(header => {
    const lbl = header.querySelector('.accordion-label')?.textContent ?? '';
    header.addEventListener('click', () => {
      onToggle(lbl, header.getAttribute('aria-expanded') === 'true');
    });
  });

  wrapper.append(accordion);
  return wrapper;
}
