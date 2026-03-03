import axios from "axios";
import qs from "qs";
import conf from "./conf";

async function getToken() {
    const data = qs.stringify({
        username: conf.USERNAME,
        password: conf.PASSWORD
    });
    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
    };

    try {
        const token_response = await axios.post(`${conf.BASE_URL}/system/auth/jwt/login`, data, config);
        return token_response.data['access_token'];
    } catch (error) {
        console.error('Error fetching token:', error);
        throw error;
    }
}

export async function makeAuthorizedPostRequest(url, data) {
    try {
        const token = await getToken();
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 5000
        });
        return response
    } catch (error) {
        console.error('Error making authorized request:', error);
    }
}


export async function makeAuthorizedRequest(url) {
    try {
        const token = await getToken();
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            timeout: 5000
        });

        let nodes = response.data.data.graph.elements.nodes
        let edges = response.data.data.graph.elements.edges

        return { nodes, edges };
    } catch (error) {
        console.error('Error making authorized request:', error);
    }
}
