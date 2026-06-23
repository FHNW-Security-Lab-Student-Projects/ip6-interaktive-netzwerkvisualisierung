import type cytoscape from 'cytoscape';
import { getDevice } from '../generated/sdk.gen.ts';
import type { DeviceResponse } from '../generated/types.gen.ts';
import type { ExpandCollapseOptions } from '../expand-collapse.ts';
import { buildHeader } from './panel/header.ts';
import { buildSections } from './panel/sections.ts';

export type DetailPanelSetup = ExpandCollapseOptions & {
  setFocusNode: (fn: (nodeId: string) => void) => void;
};

export function setupDetailPanel(
  cy: cytoscape.Core,
  opts?: { networkId?: number; snapshotId?: number },
): DetailPanelSetup {
  const panelEl = document.getElementById('device-panel');
  if (!panelEl) return { setFocusNode: () => {} };

  const panel = new DetailPanel(panelEl);
  let selectedNodeId: string | null = null;
  let focusNodeFn: ((nodeId: string) => void) | null = null;

  const updatePanel = (nodeId: string) => {
    const node = cy.$id(nodeId);
    const nodeType = node.data('node_type') as string | undefined;
    const isCollapsed = node.hasClass('collapsed');
    if (nodeType === 'group' || isCollapsed) {
      panel.showPlaceholder(nodeId, node.data('label') as string | undefined);
    } else {
      panel.show(nodeId, {
        ...opts,
        nodeType,
        deviceType: node.data('device_type') as string | undefined,
      });
    }
  };

  const selectNode = (nodeId: string) => {
    if (focusNodeFn) {
      // focusNode expands collapsed ancestors, pans, selects, and emits tap →
      // onNodeClick fires after 250ms debounce → updatePanel
      focusNodeFn(nodeId);
      return;
    }
    const target = cy.$id(nodeId) as cytoscape.NodeSingular;
    if (target.length) {
      cy.animate({ center: { eles: target }, duration: 400 });
      cy.nodes().unselect();
      cy.edges().unselect();
      target.select();
    }
    selectedNodeId = nodeId;
    updatePanel(nodeId);
  };

  panel.setNodeSelectHandler(selectNode);

  cy.on('tap', event => {
    if (event.target === cy) {
      cy.nodes().unselect();
      cy.edges().unselect();
      panel.hide();
    }
  });

  cy.on('tap', 'edge', event => {
    event.stopPropagation();
    const edge = event.target as cytoscape.EdgeSingular;
    cy.nodes().unselect();
    cy.edges().unselect();
    edge.select();
    selectedNodeId = null;
    panel.showEdge(edge, cy);
  });

  return {
    onNodeClick: (nodeId) => {
      cy.edges().unselect();
      selectedNodeId = nodeId;
      updatePanel(nodeId);
    },
    onExpand: (nodeId) => { if (nodeId === selectedNodeId) updatePanel(nodeId); },
    setFocusNode: (fn) => { focusNodeFn = fn; },
  };
}

export class DetailPanel {
  private container: HTMLElement;
  private content: HTMLElement;
  private openAccordions = new Set<string>();
  private onNodeSelect?: (nodeId: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    const handle = document.createElement('div');
    handle.className = 'panel-resize-handle';
    container.prepend(handle);

    this.content = document.createElement('div');
    this.content.className = 'panel-content';
    container.append(this.content);

    let drag: { startX: number; startW: number } | null = null;
    handle.addEventListener('mousedown', e => {
      drag = { startX: e.clientX, startW: container.offsetWidth };
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      const dx = drag.startX - e.clientX;
      container.style.width = `${Math.max(280, Math.min(800, drag.startW + dx))}px`;
    });
    document.addEventListener('mouseup', () => {
      if (!drag) return;
      drag = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    });
  }

  setNodeSelectHandler(fn: (nodeId: string) => void): void {
    this.onNodeSelect = fn;
  }

  async show(deviceId: string, opts?: { networkId?: number; snapshotId?: number; nodeType?: string; deviceType?: string }): Promise<void> {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildLoading());

    const { data, error } = await getDevice({
      path: { device_id: deviceId },
      query: {
        explorer_network_id: opts?.networkId,
        snapshot_id: opts?.snapshotId,
      },
    });

    if (error || !data?.data?.data) {
      this.setContent(this.buildError(deviceId));
      return;
    }

    this.setContent(this.buildPanel(data.data, { nodeType: opts?.nodeType, deviceType: opts?.deviceType }));
  }

  showEdge(edge: cytoscape.EdgeSingular, cy: cytoscape.Core): void {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildEdgePanel(edge, cy));
  }

  showPlaceholder(nodeId: string, label?: string): void {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildCompoundPlaceholder(nodeId, label));
  }

  hide(): void {
    this.container.setAttribute('hidden', '');
    this.content.innerHTML = '';
  }

  private setContent(el: HTMLElement): void {
    this.content.innerHTML = '';
    this.content.append(el);
  }

  private buildPanel(device: DeviceResponse, context?: { nodeType?: string; deviceType?: string }): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.append(
      buildHeader(device, context),
      buildSections(device.data, this.openAccordions, (lbl, isOpen) => {
        if (isOpen) { this.openAccordions.add(lbl); } else { this.openAccordions.delete(lbl); }
      }, this.onNodeSelect),
    );
    return wrapper;
  }

  private buildEdgePanel(edge: cytoscape.EdgeSingular, cy: cytoscape.Core): HTMLElement {
    const data = edge.data() as {
      source: string; target: string; label?: string; redundancy?: number;
      orig_source?: string; orig_target?: string;
    };
    // For lifted edges, orig_source/orig_target hold the real child node IDs.
    const effectiveSource = data.orig_source ?? data.source;
    const effectiveTarget = data.orig_target ?? data.target;
    const sourceNode = cy.$id(effectiveSource) as cytoscape.NodeSingular;
    const targetNode = cy.$id(effectiveTarget) as cytoscape.NodeSingular;
    const sourceName = (sourceNode.data('title') as string | undefined) ?? effectiveSource;
    const targetName = (targetNode.data('title') as string | undefined) ?? effectiveTarget;
    const classes = edge.classes().filter(Boolean);

    const wrapper = document.createElement('div');
    wrapper.className = 'edge-panel';

    const header = document.createElement('div');
    header.className = 'edge-panel-header';
    header.textContent = 'Connection';
    wrapper.append(header);

    const makeEndpoint = (label: string, name: string, nodeId: string): HTMLElement => {
      const row = document.createElement('div');
      row.className = 'edge-panel-row';
      const lbl = document.createElement('span');
      lbl.className = 'edge-panel-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.className = 'edge-panel-node';
      val.textContent = name;
      if (this.onNodeSelect) {
        val.addEventListener('click', () => this.onNodeSelect!(nodeId));
      }
      row.append(lbl, val);
      return row;
    };

    wrapper.append(
      makeEndpoint('From', sourceName, effectiveSource),
      makeEndpoint('To', targetName, effectiveTarget),
    );

    if (classes.length > 0) {
      const row = document.createElement('div');
      row.className = 'edge-panel-row';
      const lbl = document.createElement('span');
      lbl.className = 'edge-panel-label';
      lbl.textContent = 'Type';
      const val = document.createElement('span');
      val.textContent = classes.join(', ');
      row.append(lbl, val);
      wrapper.append(row);
    }

    if (data.redundancy && data.redundancy > 1) {
      const row = document.createElement('div');
      row.className = 'edge-panel-row';
      const lbl = document.createElement('span');
      lbl.className = 'edge-panel-label';
      lbl.textContent = 'Redundancy';
      const val = document.createElement('span');
      val.textContent = String(data.redundancy);
      row.append(lbl, val);
      wrapper.append(row);
    }

    if (data.label) {
      const row = document.createElement('div');
      row.className = 'edge-panel-row';
      const lbl = document.createElement('span');
      lbl.className = 'edge-panel-label';
      lbl.textContent = 'Label';
      const val = document.createElement('span');
      val.textContent = data.label;
      row.append(lbl, val);
      wrapper.append(row);
    }

    return wrapper;
  }

  private buildLoading(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'panel-loading';
    el.innerHTML = '<div class="panel-spinner"></div><span>Loading…</span>';
    return el;
  }

  private buildError(deviceId: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'panel-error';
    const p = document.createElement('p');
    p.textContent = 'Could not load device';
    const code = document.createElement('code');
    code.textContent = deviceId;
    el.append(p, code);
    return el;
  }

  private buildCompoundPlaceholder(nodeId: string, label?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'panel-placeholder';
    const title = document.createElement('div');
    title.className = 'placeholder-title';
    title.textContent = `Logical Group: ${label ?? nodeId}`;
    const sub = document.createElement('div');
    sub.className = 'placeholder-sub';
    sub.textContent = 'Group details coming soon.';
    el.append(title, sub);
    return el;
  }
}
