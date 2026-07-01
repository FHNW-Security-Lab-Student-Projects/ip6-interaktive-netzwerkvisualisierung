import type cytoscape from 'cytoscape';
import { getDevice, getHost } from '../generated/sdk.gen.ts';
import type { DeviceInfoOutput, DeviceResponse, HostResponse } from '../generated/types.gen.ts';
import type { ExpandCollapseOptions } from '../expand-collapse.ts';
import { buildHeader } from './panel/header.ts';
import { buildSections } from './panel/sections.ts';
import { buildEdgePanel } from './panel/edge.ts';
import { buildHostPanelEl } from './panel/host-panel.ts';

export type DetailPanelSetup = ExpandCollapseOptions & {
  setFocusNode: (fn: (nodeId: string) => void) => void;
  refreshCurrentPanel: () => void;
};

export function setupDetailPanel(
  cy: cytoscape.Core,
  opts?: {
    networkId?: number;
    snapshotId?: number;
    mockDeviceData?: Map<string, DeviceInfoOutput>;
    getStpInstanceKey?: () => string | null;
    resolveBridgeMac?: (mac: string) => { id: string; name: string } | null;
  },
): DetailPanelSetup {
  const panelEl = document.getElementById('device-panel');
  if (!panelEl) return { setFocusNode: () => {}, refreshCurrentPanel: () => {} };

  const panel = new DetailPanel(panelEl);
  if (opts?.mockDeviceData) panel.setMockDeviceData(opts.mockDeviceData);
  if (opts?.getStpInstanceKey) panel.setStpKeyGetter(opts.getStpInstanceKey);
  if (opts?.resolveBridgeMac) panel.setMacResolver(opts.resolveBridgeMac);
  panel.setNeighTypeResolver((nodeId: string) => {
    const node = cy.$id(nodeId);
    if (!node.length) return undefined;
    const deviceType = node.data('device_type') as string | undefined;
    if (deviceType) return deviceType;
    const nodeType = node.data('node_type') as string | undefined;
    if (nodeType === 'host' || nodeType === 'custom') return nodeType;
    return undefined;
  });
  let selectedNodeId: string | null = null;
  let lastEdge: cytoscape.EdgeSingular | null = null;
  let focusNodeFn: ((nodeId: string) => void) | null = null;

  const applyFocus = (nodeId: string): void => {
    const node = cy.$id(nodeId);
    const selfAndDesc = node.union(node.descendants());
    const connectedEdges = selfAndDesc.connectedEdges();
    const connectedNodes = connectedEdges.connectedNodes().difference(selfAndDesc);
    const siblings = node.parent().children();
    const keep = selfAndDesc
      .union(connectedEdges)
      .union(connectedNodes)
      .union(connectedNodes.descendants())
      .union(connectedNodes.ancestors())
      .union(node.ancestors())
      .union(siblings)
      .union(siblings.edgesWith(siblings));
    cy.elements().removeClass('faded');
    cy.elements().not(keep).addClass('faded');
  };

  const clearFocus = (): void => {
    cy.elements().removeClass('faded');
  };

  const updatePanel = (nodeId: string) => {
    const node = cy.$id(nodeId);
    const nodeType = node.data('node_type') as string | undefined;
    const isCollapsed = node.hasClass('collapsed');
    if (nodeType === 'group' || isCollapsed) {
      panel.showPlaceholder(nodeId, node.data('label') as string | undefined);
    } else if (nodeType === 'custom') {
      panel.showCustomNodePlaceholder(nodeId, node.data('label') as string | undefined);
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
    selectedNodeId = null;
    lastEdge = null;
    clearFocus();
  });

  cy.on('tap', event => {
    if (event.target === cy) {
      cy.nodes().unselect();
      cy.edges().unselect();
      panel.hide();
      clearFocus();
    }
  });

  cy.on('tap', 'edge', event => {
    event.stopPropagation();
    const edge = event.target as cytoscape.EdgeSingular;
    cy.nodes().unselect();
    cy.edges().unselect();
    edge.select();
    selectedNodeId = null;
    lastEdge = edge;
    clearFocus();
    void panel.showEdge(edge, cy, opts);
  });

  return {
    onNodeClick: (nodeId) => {
      cy.edges().unselect();
      selectedNodeId = nodeId;
      lastEdge = null;
      updatePanel(nodeId);
      applyFocus(nodeId);
    },
    onExpand: (nodeId) => { if (nodeId === selectedNodeId) updatePanel(nodeId); },
    setFocusNode: (fn) => { focusNodeFn = fn; },
    refreshCurrentPanel: () => {
      if (selectedNodeId) updatePanel(selectedNodeId);
      else if (lastEdge) void panel.showEdge(lastEdge, cy, opts);
    },
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
  private savedScrollTop = 0;
  private onNodeSelect?: (nodeId: string) => void;
  private onHide?: () => void;
  private mockDeviceData?: Map<string, DeviceInfoOutput>;
  private stpKeyGetter: (() => string | null) | null = null;
  private macResolver: ((mac: string) => { id: string; name: string } | null) | null = null;
  private neighTypeResolver: ((nodeId: string) => string | undefined) | null = null;

  setMockDeviceData(map: Map<string, DeviceInfoOutput>): void {
    this.mockDeviceData = map;
  }

  setStpKeyGetter(fn: () => string | null): void {
    this.stpKeyGetter = fn;
  }

  setMacResolver(fn: (mac: string) => { id: string; name: string } | null): void {
    this.macResolver = fn;
  }

  setNeighTypeResolver(fn: (nodeId: string) => string | undefined): void {
    this.neighTypeResolver = fn;
  }

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
    this.savedScrollTop = this.container.scrollTop;
    this.setContent(this.buildLoading());

    const query = { explorer_network_id: opts?.networkId, snapshot_id: opts?.snapshotId };

    if (opts?.nodeType === 'host') {
      const { data, error } = await getHost({ path: { host_id: deviceId }, query });
      if (error || !data?.data) {
        this.setContent(this.buildError(deviceId));
      } else {
        this.setContent(this.buildHostPanel(data.data, opts));
      }
      requestAnimationFrame(() => { this.container.scrollTop = this.savedScrollTop; });
      return;
    }

    const { data, error } = await getDevice({ path: { device_id: deviceId }, query });
    if (error || !data?.data?.data) {
      this.setContent(this.buildError(deviceId));
    } else {
      this.setContent(this.buildPanel(data.data, { nodeType: opts?.nodeType, deviceType: opts?.deviceType }));
    }
    requestAnimationFrame(() => { this.container.scrollTop = this.savedScrollTop; });
  }

  async showEdge(
    edge: cytoscape.EdgeSingular,
    cy: cytoscape.Core,
    opts?: { networkId?: number; snapshotId?: number },
  ): Promise<void> {
    this.container.removeAttribute('hidden');
    this.savedScrollTop = this.container.scrollTop;
    this.setContent(this.buildLoading());

    const edgeData = edge.data() as EdgePanelData;
    const effectiveSource = edgeData.orig_source ?? edgeData.source;
    const effectiveTarget = edgeData.orig_target ?? edgeData.target;

    const query = { explorer_network_id: opts?.networkId, snapshot_id: opts?.snapshotId };
    const fetchIfNeeded = (id: string) =>
      this.mockDeviceData?.has(id)
        ? Promise.resolve(undefined)
        : getDevice({ path: { device_id: id }, query });

    const [srcResult, tgtResult] = await Promise.all([
      fetchIfNeeded(effectiveSource),
      fetchIfNeeded(effectiveTarget),
    ]);

    const srcInfo = this.mockDeviceData?.get(effectiveSource) ?? srcResult?.data?.data?.data ?? null;
    const tgtInfo = this.mockDeviceData?.get(effectiveTarget) ?? tgtResult?.data?.data?.data ?? null;

    this.setContent(buildEdgePanel(
      edge, cy, effectiveSource, effectiveTarget, srcInfo, tgtInfo,
      this.openAccordions,
      (key, isOpen) => { if (isOpen) { this.openAccordions.add(key); } else { this.openAccordions.delete(key); } },
      this.onNodeSelect,
      this.stpKeyGetter?.() ?? null,
      this.macResolver ?? undefined,
    ));
    requestAnimationFrame(() => { this.container.scrollTop = this.savedScrollTop; });
  }

  showPlaceholder(nodeId: string, label?: string): void {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildCompoundPlaceholder(nodeId, label));
  }

  showCustomNodePlaceholder(nodeId: string, label?: string): void {
    this.container.removeAttribute('hidden');
    this.setContent(this.buildCustomNodePlaceholder(nodeId, label));
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
      }, this.onNodeSelect, this.stpKeyGetter?.() ?? null, this.macResolver ?? undefined, this.neighTypeResolver ?? undefined),
    );
    return wrapper;
  }

  private buildHostPanel(host: HostResponse, context?: { nodeType?: string }): HTMLElement {
    return buildHostPanelEl(host, context, this.onNodeSelect);
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

  private buildCustomNodePlaceholder(nodeId: string, label?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'panel-placeholder';
    const title = document.createElement('div');
    title.className = 'placeholder-title';
    title.textContent = `Custom Node: ${label ?? nodeId}`;
    const sub = document.createElement('div');
    sub.className = 'placeholder-sub';
    sub.textContent = 'No data available for custom nodes.';
    el.append(title, sub);
    return el;
  }
}
