import cytoscape from 'cytoscape';
import type { LayoutProvider } from '../layout-utils.ts';

// Shared across this module and the expand-collapse state machine: the layout
// currently in flight, so a newer layout can supersede an older one's post-processing.
let activeLayout: cytoscape.Layouts | null = null;

export function getActiveLayout(): cytoscape.Layouts | null {
  return activeLayout;
}

export function setActiveLayout(layout: cytoscape.Layouts | null): void {
  activeLayout = layout;
}

export function stopActiveLayout(): void {
  activeLayout?.stop();
}

// Iteratively nudges sibling compound bounding boxes apart until no overlaps remain,
// then animates from the pre-separation positions to the final ones.
// Nested compounds (one is ancestor of the other) are intentionally skipped.
export function separateSiblingCompounds(cy: cytoscape.Core): void {
  const compounds = cy.nodes(':parent:not(.collapsed)').toArray() as cytoscape.NodeSingular[];
  if (compounds.length < 2) return;

  const allLeaves = cy.nodes(':parent:not(.collapsed)').descendants().not(':parent');
  const startPos = new Map<string, cytoscape.Position>();
  allLeaves.forEach(n => {
    startPos.set((n as cytoscape.NodeSingular).id(), { ...(n as cytoscape.NodeSingular).position() });
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations++ < 20) {
    changed = false;
    for (let i = 0; i < compounds.length; i++) {
      for (let j = i + 1; j < compounds.length; j++) {
        const a = compounds[i];
        const b = compounds[j];
        if (a.ancestors().has(b) || b.ancestors().has(a)) continue;
        const bbA = a.boundingBox({ includeLabels: true });
        const bbB = b.boundingBox({ includeLabels: true });
        const overlapX = Math.min(bbA.x2, bbB.x2) - Math.max(bbA.x1, bbB.x1);
        const overlapY = Math.min(bbA.y2, bbB.y2) - Math.max(bbA.y1, bbB.y1);
        if (overlapX <= 0 || overlapY <= 0) continue;
        changed = true;
        const margin = 20;
        const cAx = (bbA.x1 + bbA.x2) / 2;
        const cAy = (bbA.y1 + bbA.y2) / 2;
        const cBx = (bbB.x1 + bbB.x2) / 2;
        const cBy = (bbB.y1 + bbB.y2) / 2;
        let dx = 0, dy = 0;
        if (overlapX < overlapY) {
          const push = (overlapX + margin) / 2;
          dx = cAx < cBx ? -push : push;
        } else {
          const push = (overlapY + margin) / 2;
          dy = cAy < cBy ? -push : push;
        }
        a.descendants().not(':parent').shift({ x: dx, y: dy });
        b.descendants().not(':parent').shift({ x: -dx, y: -dy });
      }
    }
  }

  const endPos = new Map<string, cytoscape.Position>();
  allLeaves.forEach(n => {
    const id = (n as cytoscape.NodeSingular).id();
    endPos.set(id, { ...(n as cytoscape.NodeSingular).position() });
    (n as cytoscape.NodeSingular).position(startPos.get(id)!);
  });
  allLeaves.forEach(n => {
    const id = (n as cytoscape.NodeSingular).id();
    const s = startPos.get(id)!;
    const e = endPos.get(id)!;
    if (Math.abs(e.x - s.x) > 0.5 || Math.abs(e.y - s.y) > 0.5) {
      (n as cytoscape.NodeSingular).animate({ position: e }, { duration: 300 });
    }
  });
}

// After expanding, bring the opened compound into focus: always center it,
// and zoom out (never in) only enough to show the whole compound if it doesn't
// already fit at the current zoom.
export function focusOnCompound(cy: cytoscape.Core, anchorId: string): void {
  const anchor = cy.$id(anchorId);
  if (!anchor.length) return;
  const eles = anchor.union(anchor.descendants());
  const bb = eles.boundingBox();
  const ext = cy.extent(); // viewport in model coords
  cy.stop(); // cancel any in-flight viewport pan (e.g. a prior selection) so we don't jump there first
  if (bb.w <= ext.w && bb.h <= ext.h) {
    // Already fits: keep zoom, just re-center.
    cy.animate({ center: { eles }, duration: 400 });
  } else {
    // Too big for the current zoom: zoom out just enough to fit it, centered.
    cy.animate({ fit: { eles, padding: 40 }, duration: 400 });
  }
}

export function capturePositions(cy: cytoscape.Core): Map<string, cytoscape.Position> {
  const positions = new Map<string, cytoscape.Position>();
  cy.nodes(':visible').forEach(n => {
    positions.set((n as cytoscape.NodeSingular).id(), (n as cytoscape.NodeSingular).position());
  });
  return positions;
}

export function runExpandCollapseLayout(
  cy: cytoscape.Core,
  layout: LayoutProvider,
  snapshot: Map<string, cytoscape.Position>,
  anchorId: string,
  focusOnExpand: boolean,
  onStop?: () => void,
): void {
  layout.register();

  // Bubble zone: all visible nodes inside the anchor's immediate parent compound.
  // If the anchor has no parent (root-level), fall back to edge neighbors.
  // Everything outside the bubble zone is locked so the expand stays local.
  const bubbleZone = new Set<string>();
  const anchorParent = cy.$id(anchorId).parent();
  if (anchorParent.length) {
    anchorParent.descendants().forEach(n => {
      if (snapshot.has((n as cytoscape.NodeSingular).id()))
        bubbleZone.add((n as cytoscape.NodeSingular).id());
    });
  } else {
    cy.$id(anchorId).neighborhood('node').forEach(n => {
      if (snapshot.has((n as cytoscape.NodeSingular).id()))
        bubbleZone.add((n as cytoscape.NodeSingular).id());
    });
  }

  // Lock outer leaf nodes. Compound nodes are skipped: fCOSE positions them from
  // their children, so locking only a compound parent doesn't prevent fCOSE from
  // moving its children. Locking the leaves achieves the same effect reliably.
  const locked: string[] = [];
  snapshot.forEach((pos, nodeId) => {
    if (bubbleZone.has(nodeId) || nodeId === anchorId) return;
    const node = cy.$id(nodeId) as cytoscape.NodeSingular;
    if (!node.length || node.isParent()) return;
    node.position(pos);
    node.lock();
    locked.push(nodeId);
  });

  const options = { ...layout.expandCollapse(), randomize: false, fit: false };
  const layoutInstance = cy.layout(options);

  layoutInstance.on('layoutstop', () => {
    // Always unlock so subsequent layouts can reposition these nodes.
    locked.forEach(nodeId => {
      const node = cy.$id(nodeId);
      if (node.length) (node as cytoscape.NodeSingular).unlock();
    });
    // Only run post-processing if this layout wasn't cancelled by a newer one.
    if (activeLayout === layoutInstance) {
      separateSiblingCompounds(cy);
      onStop?.();
      if (focusOnExpand) {
        focusOnCompound(cy, anchorId);
      }
    }
  });

  // Claim active before stopping the previous layout, so its re-emitted
  // layoutstop sees it's been superseded and skips its post-processing.
  const prev = activeLayout;
  activeLayout = layoutInstance;
  prev?.stop();
  layoutInstance.run();
}
