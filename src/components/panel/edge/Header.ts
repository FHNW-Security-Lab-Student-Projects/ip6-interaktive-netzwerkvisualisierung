import { makeStatusDot, makeChip, makeNodeName, type StatusLevel } from '../utils.ts';

export function buildEdgeHeader(
  srcId: string, srcName: string, srcType: string,
  tgtId: string, tgtName: string, tgtType: string,
  status: StatusLevel,
  warnings: string[],
  discoveredBySrc: boolean,
  discoveredByTgt: boolean,
  onNodeSelect?: (nodeId: string) => void,
): HTMLElement {
  const header = document.createElement('div');
  header.className = 'panel-header panel-header--edge';

  const heroRow = document.createElement('div');
  heroRow.className = 'panel-hero-row';

  const makeNameLink = (nodeId: string, type: string, name: string): HTMLElement => {
    const wrapper = document.createElement('span');
    wrapper.className = 'edge-endpoint';
    wrapper.append(makeNodeName(name, nodeId, onNodeSelect));
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

  const statusTooltips: Record<StatusLevel, string> = {
    online: 'All connections up',
    warn: 'Degraded – some connections down or configuration warnings',
    down: 'All connections down',
    unknown: 'Unknown',
  };
  heroRow.append(makeStatusDot(status, statusTooltips[status]), makeNameLink(srcId, srcType, srcName), sep, makeNameLink(tgtId, tgtType, tgtName));
  header.append(heroRow);

  if (warnings.length > 0) {
    for (const reason of warnings) {
      const w = document.createElement('div');
      w.className = 'edge-warning-item';
      w.textContent = `⚠ ${reason}`;
      header.append(w);
    }
  }

  return header;
}
