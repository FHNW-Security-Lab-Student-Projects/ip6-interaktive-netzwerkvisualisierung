/// <reference types="vite/client" />

declare module 'cytoscape-elk' {
  import cytoscape from 'cytoscape';
  const elk: cytoscape.Ext;
  export default elk;
}

declare module 'cytoscape-cola' {
  import cytoscape from 'cytoscape';
  const cola: cytoscape.Ext;
  export default cola;
}

declare module 'cytoscape-dagre' {
  import cytoscape from 'cytoscape';
  const dagre: cytoscape.Ext;
  export default dagre;
}

declare module 'cytoscape-d3-force' {
  import cytoscape from 'cytoscape';
  const d3Force: cytoscape.Ext;
  export default d3Force;
}

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string;
  readonly VITE_USERNAME: string;
  readonly VITE_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
