import cytoscape from 'cytoscape';
import type { LayoutProvider } from '../layout-utils.ts';
import type { ExpandCollapseOptions } from '../expand-collapse.ts';
import { capturePositions, runExpandCollapseLayout } from './layout.ts';

interface ContextMenuDeps {
  layout: LayoutProvider;
  options?: ExpandCollapseOptions;
  doExpandAll: (node: cytoscape.NodeSingular) => void;
  doCollapseAll: (node: cytoscape.NodeSingular) => void;
  focusNode: (nodeId: string) => void;
}

export function setupContextMenu(cy: cytoscape.Core, deps: ContextMenuDeps): void {
  const { layout, options, doExpandAll, doCollapseAll, focusNode } = deps;
  let activeMenu: HTMLElement | null = null;

  function closeMenu(): void {
    activeMenu?.remove();
    activeMenu = null;
  }

  cy.on('cxttap', 'node', event => {
    event.stopPropagation();
    closeMenu();

    const node = event.target as cytoscape.NodeSingular;
    const isCompound = node.isParent() || node.hasClass('collapsed');
    const nodeType = (node.data('node_type') as string | undefined) ?? 'device';

    const container = cy.container();
    if (!container) return;

    const rp = event.renderedPosition as { x: number; y: number };

    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    activeMenu = menu;

    if (isCompound) {
      // Use all selected compound nodes; fall back to just the right-clicked node.
      const selectedCompounds = cy.nodes(':selected').filter(
        n => (n as cytoscape.NodeSingular).isParent() || (n as cytoscape.NodeSingular).hasClass('collapsed')
      ).toArray() as cytoscape.NodeSingular[];
      const targets = selectedCompounds.length > 0 ? selectedCompounds : [node];

      const expandBtn = document.createElement('button');
      expandBtn.textContent = 'Expand all';
      expandBtn.addEventListener('click', () => {
        closeMenu();
        const snapshot = capturePositions(cy);
        targets.forEach(t => doExpandAll(t));
        runExpandCollapseLayout(cy, layout, snapshot, node.id(), true);
        options?.onExpand?.(node.id());
      });

      const collapseBtn = document.createElement('button');
      collapseBtn.textContent = 'Collapse all';
      collapseBtn.addEventListener('click', () => {
        closeMenu();
        const snapshot = capturePositions(cy);
        targets.forEach(t => doCollapseAll(t));
        runExpandCollapseLayout(cy, layout, snapshot, node.id(), false);
      });

      menu.append(expandBtn, collapseBtn);
    }

    if (nodeType !== 'group') {
      if (menu.children.length > 0) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#eee;margin:2px 0;';
        menu.append(sep);
      }

      const locateBtn = document.createElement('button');
      locateBtn.textContent = 'Locate device';
      locateBtn.addEventListener('click', () => {
        closeMenu();
        focusNode(node.id());
      });
      menu.append(locateBtn);

      if (options?.onCompare) {
        const inCompare = options.onCompareHas?.(node.id()) ?? false;
        const compareBtn = document.createElement('button');
        compareBtn.textContent = inCompare ? 'Remove from comparison' : 'Add to comparison';
        compareBtn.addEventListener('click', () => {
          closeMenu();
          options.onCompare!(node.id(), nodeType);
        });
        menu.append(compareBtn);
      }
    }

    if (!menu.children.length) return;

    menu.addEventListener('mousedown', e => e.stopPropagation());

    container.style.position = 'relative';
    container.append(menu);

    const maxX = container.offsetWidth - menu.offsetWidth - 4;
    const maxY = container.offsetHeight - menu.offsetHeight - 4;
    menu.style.left = `${Math.min(rp.x, maxX)}px`;
    menu.style.top  = `${Math.min(rp.y, maxY)}px`;
  });

  cy.on('tap', () => closeMenu());

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });

  document.addEventListener('mousedown', e => {
    if (activeMenu && !activeMenu.contains(e.target as Node)) closeMenu();
  });
}
