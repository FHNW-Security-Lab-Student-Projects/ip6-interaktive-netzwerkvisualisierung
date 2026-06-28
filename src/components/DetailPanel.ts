import type cytoscape from 'cytoscape';
import { getDevice } from '../generated/sdk.gen.ts';
import type { DeviceResponse } from '../generated/types.gen.ts';
import type { ExpandCollapseOptions } from '../expand-collapse.ts';
import { buildHeader } from './panel/header.ts';
import { buildSections } from './panel/sections.ts';
import { buildEdgePanel } from './panel/edge.ts';

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
  panel.setHideHandler(() => {
    cy.nodes().unselect();
    cy.edges().unselect();
  });

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
    void panel.showEdge(edge, cy, opts);
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

type EdgePanelData = {
  source: string;
  target: string;
  label?: string;
  redundancy?: number;
  orig_source?: string;
  orig_target?: string;
};


export class DetailPanel {
  private container: HTMLElement;
  private content: HTMLElement;
  private openAccordions = new Set<string>();
  private onNodeSelect?: (nodeId: string) => void;
  private onHide?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;

    const handle = document.createElement('div');
    handle.className = 'panel-resize-handle';
    container.prepend(handle);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'panel-close-btn';
    closeBtn.setAttribute('aria-label', 'Close panel');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.hide());
    container.append(closeBtn);

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

  setHideHandler(fn: () => void): void {
    this.onHide = fn;
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

  async showEdge(
    edge: cytoscape.EdgeSingular,
    cy: cytoscape.Core,
    opts?: { networkId?: number; snapshotId?: number },
  ): Promise<void> {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildLoading());

    const edgeData = edge.data() as EdgePanelData;
    const effectiveSource = edgeData.orig_source ?? edgeData.source;
    const effectiveTarget = edgeData.orig_target ?? edgeData.target;

    const query = { explorer_network_id: opts?.networkId, snapshot_id: opts?.snapshotId };
    const [srcResult, tgtResult] = await Promise.all([
      getDevice({ path: { device_id: effectiveSource }, query }),
      getDevice({ path: { device_id: effectiveTarget }, query }),
    ]);

    const srcInfo = srcResult.data?.data?.data ?? null;
    const tgtInfo = tgtResult.data?.data?.data ?? null;

    this.setContent(buildEdgePanel(
      edge, cy, effectiveSource, effectiveTarget, srcInfo, tgtInfo,
      this.openAccordions,
      (key, isOpen) => { if (isOpen) { this.openAccordions.add(key); } else { this.openAccordions.delete(key); } },
      this.onNodeSelect,
    ));
  }

  showPlaceholder(nodeId: string, label?: string): void {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildCompoundPlaceholder(nodeId, label));
  }

  hide(): void {
    this.container.setAttribute('hidden', '');
    this.content.innerHTML = '';
    this.onHide?.();
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
