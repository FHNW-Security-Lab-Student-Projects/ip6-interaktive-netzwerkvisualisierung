import type cytoscape from 'cytoscape';
import { getDevice } from '../generated/sdk.gen.ts';
import type { DeviceResponse } from '../generated/types.gen.ts';
import type { ExpandCollapseOptions } from '../expand-collapse.ts';
import { buildHeader } from './panel/header.ts';
import { buildSections } from './panel/sections.ts';

export function setupNodeDetailPanel(
  cy: cytoscape.Core,
  opts?: { networkId?: number; snapshotId?: number },
): ExpandCollapseOptions {
  const panelEl = document.getElementById('device-panel');
  if (!panelEl) return {};

  const panel = new NodeDetailPanel(panelEl);
  let selectedNodeId: string | null = null;

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

  cy.on('tap', event => {
    if (event.target === cy) panel.hide();
  });

  return {
    onNodeClick: (nodeId) => { selectedNodeId = nodeId; updatePanel(nodeId); },
    onExpand: (nodeId) => { if (nodeId === selectedNodeId) updatePanel(nodeId); },
  };
}

export class NodeDetailPanel {
  private container: HTMLElement;
  private content: HTMLElement;
  private openAccordions = new Set<string>();

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
      }),
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
