import cytoscape from 'cytoscape';

// Encapsulates everything needed to run a layout algorithm: plugin registration,
// initial layout options, and expand/collapse re-layout options.
// Pass to runLayout / setupExpandCollapse to switch algorithms without touching other code.
export type LayoutProvider = {
  register(): void;     // must be idempotent; cytoscape.use is safe to call repeatedly
  initial(): cytoscape.LayoutOptions;
  expandCollapse(): cytoscape.LayoutOptions;
};

// Runs the initial layout and persists positions to localStorage; restores them on reload.
// Clears stale cache and re-runs if new nodes are detected. Operates on visible nodes only.
export function runLayout(
  cy: cytoscape.Core,
  positionsKey: string,
  layout: LayoutProvider,
  initialZoom?: number,
): void {
  layout.register();

  function applyZoom(): void {
    if (initialZoom === undefined) return;
    cy.fit();
    cy.zoom(cy.zoom() * initialZoom);
    cy.center();
  }

  const saved = localStorage.getItem(positionsKey);

  if (saved) {
    const positions = JSON.parse(saved) as Record<string, cytoscape.Position>;
    const allPresent = cy.nodes(':visible').every(
      n => positions[(n as cytoscape.NodeSingular).id()] !== undefined,
    );

    if (allPresent) {
      cy.layout({ name: 'preset', positions }).run();
      applyZoom();
      return;
    }
    // Graph has changed (new nodes), clear stale state and re-layout
    localStorage.removeItem(positionsKey);
  }

  const layoutInstance = cy.layout(layout.initial());

  layoutInstance.on('layoutstop', () => {
    const positions: Record<string, cytoscape.Position> = {};
    cy.nodes(':visible').forEach(n => {
      positions[(n as cytoscape.NodeSingular).id()] = (n as cytoscape.NodeSingular).position();
    });
    localStorage.setItem(positionsKey, JSON.stringify(positions));
    applyZoom();
  });

  layoutInstance.run();
}
