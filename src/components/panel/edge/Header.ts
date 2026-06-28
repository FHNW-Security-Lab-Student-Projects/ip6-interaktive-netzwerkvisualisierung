import { makeStatusDot, makeChip, type StatusLevel } from '../utils.ts';

export function buildEdgeHeader(
  srcId: string, srcName: string, srcType: string,
  tgtId: string, tgtName: string, tgtType: string,
  status: StatusLevel,
  warnings: string[],
  discoveredBySrc: boolean,
  discoveredByTgt: boolean,
  typeClasses: string[],
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const header = document.createElement('div');
  header.className = 'panel-header panel-header--edge';

  const heroRow = document.createElement('div');
  heroRow.className = 'panel-hero-row';

  const makeNameLink = (nodeId: string, type: string, name: string): HTMLElement => {
    const wrapper = document.createElement('span');
    wrapper.className = 'edge-endpoint';
    const nameEl = document.createElement('span');
    nameEl.className = 'edge-endpoint-name';
    nameEl.textContent = name;
    if (onNodeSelect) {
      nameEl.classList.add('edge-link');
      nameEl.addEventListener('click', () => onNodeSelect(nodeId));
    }
    wrapper.append(nameEl);
    if (type) wrapper.append(makeChip(type));
    return wrapper;
  };

  const sepSymbol = (discoveredBySrc && discoveredByTgt) ? '↔'
    : discoveredBySrc ? '→'
    : discoveredByTgt ? '←'
    : '↔';
  const sep = document.createElement('span');
  sep.className = 'edge-hero-separator';
  sep.textContent = sepSymbol;

  heroRow.append(makeStatusDot(status), makeNameLink(srcId, srcType, srcName), sep, makeNameLink(tgtId, tgtType, tgtName));
  header.append(heroRow);

  if (status === 'warn') {
    for (const reason of warnings) {
      const w = document.createElement('div');
      w.className = 'edge-warning-item';
      w.textContent = `⚠ ${reason}`;
      header.append(w);
    }
  }

  if (typeClasses.length > 0) {
    const chipsRow = document.createElement('div');
    chipsRow.className = 'panel-chips-row';
    typeClasses.forEach(cls => chipsRow.append(makeChip(cls)));
    header.append(chipsRow);
  }

  return header;
}
