import type cytoscape from 'cytoscape';

export function setupZoom(cy: cytoscape.Core): void {
  const container = cy.container()!;
  let pendingDelta = 0;
  let clientX = 0;
  let clientY = 0;
  let rafId: number | null = null;

  container.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    clientX = e.clientX;
    clientY = e.clientY;

    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;   // DOM_DELTA_LINE -> pixels
    if (e.deltaMode === 2) dy *= 600;  // DOM_DELTA_PAGE -> pixels

    pendingDelta += dy;

    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const delta = pendingDelta;
      pendingDelta = 0;

      const rect = container.getBoundingClientRect();
      const factor = Math.pow(2, -delta * 0.002);
      const zoom = Math.min(Math.max(cy.zoom() * factor, cy.minZoom()), cy.maxZoom());
      cy.zoom({ level: zoom, renderedPosition: { x: clientX - rect.left, y: clientY - rect.top } });
    });
  }, { passive: false });
}
