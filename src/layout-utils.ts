import cytoscape from 'cytoscape';

// Bundles a layout algorithm's registration and options so it can be swapped without touching callers.
export type LayoutProvider = {
  register(): void;     // must be idempotent; cytoscape.use is safe to call repeatedly
  initial(): cytoscape.LayoutOptions;
  expandCollapse(): cytoscape.LayoutOptions;
};

// Restores cached node positions from localStorage; re-runs the layout when new nodes appear.
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
