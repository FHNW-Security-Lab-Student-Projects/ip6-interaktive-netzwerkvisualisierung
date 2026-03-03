import cytoscape from "cytoscape";

import image from './assets/cisco.png';
import conf from "./conf";
import { makeAuthorizedRequest } from "./http-utils";

// adjust the url with the proper parameters, especially network_id
const { nodes, edges } = await makeAuthorizedRequest(`${conf.BASE_URL}/explorer/graph/basegraph?data_type=all&filter=all&explorer_network_id=2&snapshot_id=1`);

var cy = cytoscape({
    container: document.getElementById('cy'),
    zoomingEnabled: true,
    wheelSensitivity: 0.1,
    layout: null,
    style: [
        {
            selector: 'node:childless',
            style: {
                'background-opacity': 0,
                'background-image': image,
                'background-fit': 'cover',
                'text-wrap': 'wrap',
                'label': function (ele) {
                    return ele.data('label') ? ele.data('label') : 'Default Label';
                },
                'font-size': '8px',
                'text-valign': 'bottom',
                'text-margin-y': 4,
                'z-index': 1

            }
        },
        {
            selector: 'edge',
            style: {
                'line-color': '#000',
                'width': 1,
                'z-index': 1
            }
        },
    ]
});

cy.add(nodes);
cy.add(edges);
cy.fit();
cy.style().update()
