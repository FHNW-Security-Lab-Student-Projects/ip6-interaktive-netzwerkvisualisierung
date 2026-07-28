import cytoscape from 'cytoscape';
import { fcoseProvider } from '../layout-providers/fcose.ts';
import { createNetworkStyles } from '../network-styles.ts';
import { setupZoom } from '../zoom-handler.ts';
import { createDeviceNode, createEdge, createHostNode, type AnyTypedNode, type TypedCytoscapeEdge } from '../node-factory.ts';

export const title = 'Demo: Compound Parent Edges';
export const description =
  'The Netmap hides explicit edges that run from a child to its own parent compound, because the ' +
  'containment box already expresses that relationship. Left: those edges drawn explicitly (red) — ' +
  'router→switch and switch→host links pointing from a box to the nodes inside it. Right: the same ' +
  'network with those edges omitted (the app default), so only the real peer link between the routers ' +
  'remains. Node positions are identical on both sides, so only the edges differ.';

// Two routers (compounds) -> switches (compounds) -> hosts. The router<->switch and switch<->host
// links coincide with the compound nesting and are exactly the edges the app hides.
function buildGraph(): { nodes: AnyTypedNode[]; peerEdges: TypedCytoscapeEdge[]; pcEdges: TypedCytoscapeEdge[] } {
  const nodes: AnyTypedNode[] = [];
  const peerEdges: TypedCytoscapeEdge[] = [];
  const pcEdges: TypedCytoscapeEdge[] = [];

  const routers: AnyTypedNode[] = [];

  ['A', 'B'].forEach(site => {
    const router = createDeviceNode({ id: `r${site}`, title: `Router ${site}`, label: `R-${site}`, device_type: 'router' });
    nodes.push(router);
    routers.push(router);

    for (let sw = 1; sw <= 2; sw++) {
      const swNode = createDeviceNode({
        id: `s${site}${sw}`,
        title: `Switch ${site}${sw}`,
        label: `SW-${site}${sw}`,
        device_type: 'switch',
        parent: router,
      });
      nodes.push(swNode);
      // Child (switch) -> parent compound (router): hidden by the app.
      pcEdges.push(createEdge({ source: router, target: swNode, classes: 'pc' }));

      for (let h = 1; h <= 2; h++) {
        const host = createHostNode({ id: `h${site}${sw}${h}`, title: `Host ${site}${sw}.${h}`, label: `H-${site}${sw}${h}`, parent: swNode });
        nodes.push(host);
        // Child (host) -> parent compound (switch): hidden by the app.
        pcEdges.push(createEdge({ source: swNode, target: host, classes: 'pc' }));
      }
    }
  });

  // A real peer link that does NOT coincide with containment, so it is always shown.
  peerEdges.push(createEdge({ source: routers[0], target: routers[1] }));

  return { nodes, peerEdges, pcEdges };
}

const PC_EDGE_STYLE = {
  'line-color': '#e11d48',
  'width': 2.5,
  'line-style': 'solid',
  'z-index': 5,
} as const;

// Creates a labelled half-panel with its own Cytoscape instance.
function makePanel(parent: HTMLElement, label: string, elements: cytoscape.ElementDefinition[], layout: cytoscape.LayoutOptions): cytoscape.Core {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;flex:1;min-width:0;height:100%;border-left:1px solid #e2e8f0;';

  const heading = document.createElement('div');
  heading.textContent = label;
  heading.style.cssText =
    'position:absolute;top:8px;left:8px;z-index:10;padding:4px 8px;border-radius:4px;' +
    'background:rgba(255,255,255,0.9);font:600 13px sans-serif;color:#1e293b;pointer-events:none;';

  const graph = document.createElement('div');
  graph.style.cssText = 'position:absolute;inset:0;';

  wrapper.appendChild(graph);
  wrapper.appendChild(heading);
  parent.appendChild(wrapper);

  const cy = cytoscape({
    container: graph,
    zoomingEnabled: true,
    userZoomingEnabled: false,
    style: createNetworkStyles(),
    elements,
    layout,
  });
  setupZoom(cy);
  return cy;
}

export function mount(container: HTMLElement): void {
  container.style.display = 'flex';
  container.style.height = '100%';
  fcoseProvider.register();

  // Left: with the explicit child->parent edges. Lay it out, then reuse the positions on the right
  // so the only visible difference is the edges themselves.
  const left = buildGraph();
  const cyL = makePanel(
    container,
    'With explicit child→parent edges (red)',
    [...left.nodes, ...left.peerEdges, ...left.pcEdges] as cytoscape.ElementDefinition[],
    { name: 'preset' },
  );
  cyL.edges('.pc').style(PC_EDGE_STYLE);

  const layout = cyL.layout(fcoseProvider.initial());
  layout.one('layoutstop', () => {
    cyL.fit(undefined, 30);

    const positions: Record<string, cytoscape.Position> = {};
    cyL.nodes().forEach(n => {
      const node = n as cytoscape.NodeSingular;
      positions[node.id()] = { x: node.position('x'), y: node.position('y') };
    });

    // Right: same network, but without the child->parent edges (the app default).
    const right = buildGraph();
    const cyR = makePanel(
      container,
      'Without explicit edges (containment only)',
      [...right.nodes, ...right.peerEdges] as cytoscape.ElementDefinition[],
      { name: 'preset', positions },
    );
    cyR.fit(undefined, 30);
  });
  layout.run();
}
