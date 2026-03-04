import cytoscape from 'cytoscape';
import image from '../../assets/cisco.png';
import '../api/client.ts';
import { getBasegraph } from '../generated/sdk.gen.ts';

const { data, error } = await getBasegraph({
  query: {
    data_type: 'all',
    explorer_network_id: 2,
    snapshot_id: 1,
  },
});

if (error || !data?.data?.graph) {
  throw new Error(`Failed to load graph: ${JSON.stringify(error)}`);
}

const graph = data.data.graph as { elements?: { nodes?: unknown[]; edges?: unknown[] } };
const nodes = (graph.elements?.nodes ?? []) as cytoscape.ElementDefinition[];
const edges = (graph.elements?.edges ?? []) as cytoscape.ElementDefinition[];

const container = document.getElementById('cy');
if (!container) throw new Error('Could not find #cy element');

const cy = cytoscape({
  container,
  zoomingEnabled: true,
  wheelSensitivity: 0.1,
  style: [
    {
      selector: 'node:childless',
      style: {
        'background-opacity': 0,
        'background-image': image,
        'background-fit': 'cover',
        'text-wrap': 'wrap',
        'label': (ele: cytoscape.NodeSingular) => (ele.data('label') as string) ?? 'Default Label',
        'font-size': '8px',
        'text-valign': 'bottom',
        'text-margin-y': 4,
        'z-index': 1,
      },
    },
    {
      selector: 'edge',
      style: {
        'line-color': '#ff0000',
        'width': 10,
        'z-index': 1,
      },
    },
  ],
});

cy.add(nodes);
cy.add(edges);
cy.fit();
cy.style().update();
