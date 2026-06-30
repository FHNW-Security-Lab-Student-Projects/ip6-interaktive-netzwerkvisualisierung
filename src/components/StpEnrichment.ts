import type cytoscape from 'cytoscape';
import type { BasegraphQuery } from '../graph-loader.ts';
import { buildDeviceMap, enrichEdges, applyEdgeState, collectStpInstances } from '../edge-enricher.ts';
import type { DetailPanelSetup } from './DetailPanel.ts';

export interface StpEnrichmentController {
  getSelectedKey: () => string | null;
  resolveBridgeMac: (mac: string) => { id: string; name: string } | null;
  start: (panel: DetailPanelSetup) => void;
}

export function setupStpEnrichment(
  cy: cytoscape.Core,
  deviceNodeIds: string[],
  query: BasegraphQuery,
): StpEnrichmentController {
  let selectedKey: string | null = null;
  let stpDomainsVisible = false;
  const macToDevice = new Map<string, { id: string; name: string } | null>();

  const macToHsl = (mac: string): string => {
    let h = 0;
    for (const c of mac) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `hsl(${h % 360}, 70%, 42%)`;
  };

  return {
    getSelectedKey: () => selectedKey,
    resolveBridgeMac: (mac) => macToDevice.get(mac) ?? null,
    start: (panel) => {
      // Append STP toolbar controls synchronously so they appear immediately (after expand/search)
      let stpSelect: HTMLSelectElement | null = null;
      let stpDomainBtn: HTMLButtonElement | null = null;
      const toolbar = document.getElementById('toolbar');
      if (toolbar) {
        const label = document.createElement('span');
        label.textContent = 'STP';
        stpSelect = document.createElement('select');
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = 'None';
        stpSelect.append(noneOpt);
        stpDomainBtn = document.createElement('button');
        stpDomainBtn.type = 'button';
        stpDomainBtn.className = 'toolbar-toggle';
        stpDomainBtn.textContent = 'Domains';
        stpDomainBtn.disabled = true;
        toolbar.append(label, stpSelect, stpDomainBtn);
      }

      buildDeviceMap(deviceNodeIds, query).then(deviceMap => {
        for (const [deviceId, info] of deviceMap) {
          for (const inst of Object.values(info.stp?.instances ?? {})) {
            const mac = inst.bridge_address?.address;
            if (mac) {
              if (macToDevice.has(mac)) {
                macToDevice.set(mac, null); // collision: two devices share this bridge MAC
              } else {
                macToDevice.set(mac, { id: deviceId, name: info.name });
              }
            }
          }
        }
        enrichEdges(cy, deviceMap);

        const stpInstances = collectStpInstances(deviceMap);
        if (stpInstances.length >= 1 && stpSelect) {
          const byProtocol = new Map<string, typeof stpInstances>();
          for (const inst of stpInstances) {
            if (!byProtocol.has(inst.protocol)) byProtocol.set(inst.protocol, []);
            byProtocol.get(inst.protocol)!.push(inst);
          }
          for (const [proto, group] of byProtocol) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = proto;
            for (const { key, label: lbl } of group) {
              const opt = document.createElement('option');
              opt.value = key;
              opt.textContent = lbl;
              optgroup.append(opt);
            }
            stpSelect.append(optgroup);
          }
        }

        const applyDomainColors = () => {
          cy.nodes().removeStyle('outline-width outline-color outline-style');
          if (!stpDomainsVisible || !selectedKey) return;
          for (const [deviceId, info] of deviceMap) {
            const rootMac = info.stp?.instances?.[selectedKey]?.root_address?.address;
            if (!rootMac) continue;
            const node = cy.$id(deviceId);
            if (node.length) node.style({ 'outline-width': 4, 'outline-color': macToHsl(rootMac), 'outline-style': 'solid' });
          }
        };

        stpSelect?.addEventListener('change', () => {
          selectedKey = stpSelect!.value || null;
          enrichEdges(cy, deviceMap, selectedKey);
          panel.refreshCurrentPanel();
          if (stpDomainsVisible) applyDomainColors();
        });

        if (stpDomainBtn) {
          stpDomainBtn.disabled = false;
          stpDomainBtn.addEventListener('click', () => {
            stpDomainsVisible = !stpDomainsVisible;
            stpDomainBtn!.classList.toggle('active', stpDomainsVisible);
            if (stpDomainsVisible && !selectedKey && stpSelect) {
              const firstOpt = stpSelect.querySelector<HTMLOptionElement>('option[value]:not([value=""])');
              if (firstOpt) {
                stpSelect.value = firstOpt.value;
                selectedKey = firstOpt.value;
                enrichEdges(cy, deviceMap, selectedKey);
                panel.refreshCurrentPanel();
              }
            }
            applyDomainColors();
          });
        }

        cy.on('add', 'edge', evt => applyEdgeState(evt.target as cytoscape.EdgeSingular, deviceMap, selectedKey));
      });
    },
  };
}
