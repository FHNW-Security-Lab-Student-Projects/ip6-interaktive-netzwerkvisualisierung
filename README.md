# Cytoscape Minimal Example

## Prerequisits

1. Install [Docker](https://docs.docker.com/desktop/) and [Devpod](https://devpod.sh/)

2. Set Docker as provider in Devpod

## Getting started

Download and Install [Docker](https://docs.docker.com/desktop/) and [Devpod](https://devpod.sh/) and add Docker as Provider to Devpod.

[![Open in DevPod!](https://devpod.sh/assets/open-in-devpod.svg)](https://devpod.sh/open#https://gitlab.com/heitzli/trafficflow-visualization)

1. Please use either Devcontainers or preferably DevPod to work on the project. This creates an unified development environment across platforms. Just click on the DevPod badge above.

2. Copy create a file conf.js and copy the content of conf-example.js in it. Adjust the parameters to your credentials and base_url.

3. To start the client run 
```
npm run dev
```

4. For debugging you can use the integrated debugger from for example VSCode or use the Debugger for Firefox plugin. The plugin is installed in the devcontainer but needs also to be added locally. Following config should be placed in .vscode/launch.json

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Firefox",
            "request": "launch",
            "type": "firefox",
            "webRoot": "${workspaceFolder}",
            "url": "http://localhost:4000",
        }
    ]
}
```

## Documentation

- [Cytoscape.js](https://js.cytoscape.org/)
- [DevPod](https://devpod.sh/docs/what-is-devpod)
- [DevContainer](https://containers.dev/)