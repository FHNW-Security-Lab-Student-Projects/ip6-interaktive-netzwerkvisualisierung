import cytoscape from 'cytoscape';
import image from '../../assets/cisco.png';
import { getBasegraph } from '../generated/sdk.gen.ts';

export const title = 'Minimal Example';
export const description = 'Basic network graph loaded from the base graph API. Displays all nodes and edges from the default snapshot with Cisco device icons.';

export async function mount(container: HTMLElement): Promise<void> {
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

  // NOTE:
  // getBasegraph returns a full graph G=(V, E) (G=data.graph.elements), with V=data.graph.elements.nodes and E=data.graph.elements.edges. Each node has an ID, a type and a label as defined in data.graph.elements.nodes[i].data (there are more fields in data, but not all node_types share them). A node is assigned to a group by setting the parent field of the node to the ID of the parent node (parent node: node_type=group). A relationship (edge) is defined by the source and target fields of the edge, which refer to the IDs of the source and target nodes. 

  // TODO: Find a good way to enumerate all different node_types. Probably use JQ on the response to filter out all unique node_types and their corresponding labels.

  const graph = data.data.graph as { elements?: { nodes?: unknown[]; edges?: unknown[] } };
  const nodes = (graph.elements?.nodes ?? []) as cytoscape.ElementDefinition[];
  const edges = (graph.elements?.edges ?? []) as cytoscape.ElementDefinition[];

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
          'width': 2,
          'z-index': 1,
        },
      },
    ],
  });

  cy.add(nodes);
  cy.add(edges);
  cy.fit();
  cy.style().update();
}
