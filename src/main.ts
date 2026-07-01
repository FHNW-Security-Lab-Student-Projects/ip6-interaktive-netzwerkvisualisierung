import './api/client.ts';
import './style.css';

import { Visualization } from './types.ts';

const modules = import.meta.glob<Visualization>('./visualizations/*.ts');
const metaModules = import.meta.glob<{ title?: string; description?: string }>(
  './visualizations/*.ts',
  { eager: true }
);

function nameFromPath(path: string): string {
  return path.replace('./visualizations/', '').replace('.ts', '');
}

function toDisplayName(name: string): string {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function getCategory(name: string): string {
  if (name.startsWith('api-')) return 'API';
  if (name.startsWith('hierarcy-')) return 'Hierarchy';
  return 'Minimal';
}

const app = document.getElementById('app')!;

let currentPositionsKey: string | null = null;

function renderLanding(): void {
  if (currentPositionsKey) {
    localStorage.removeItem(currentPositionsKey);
    currentPositionsKey = null;
  }
  const names = Object.keys(modules).map(nameFromPath);
  const cards = names.map(name => {
    const meta = metaModules[`./visualizations/${name}.ts`];
    const title = meta?.title ?? toDisplayName(name);
    const description = meta?.description ?? '';
    const category = getCategory(name);
    return `
      <a class="landing-card" href="#${name}">
        <span class="landing-badge landing-badge--${category.toLowerCase()}">${category}</span>
        <h2>${title}</h2>
        ${description ? `<p>${description}</p>` : ''}
      </a>`;
  }).join('');

  app.innerHTML = `
    <div class="landing-header">
      <h1>Network Visualizations</h1>
      <p class="landing-subtitle">${names.length} prototypes</p>
    </div>
    <div class="landing-grid">${cards}</div>
  `;
}

async function renderVisualization(name: string): Promise<void> {
  const path = `./visualizations/${name}.ts`;
  const load = modules[path];
  if (!load) {
    window.location.hash = '';
    return;
  }
  const { title, description, mount } = await load();
  currentPositionsKey = title ? `netviz-positions-${title}` : null;
  app.innerHTML = `
    <div id="toolbar"></div>
    <div id="viz-wrapper">
      <div id="viz"></div>
      <aside id="device-panel" hidden></aside>
    </div>
    <footer>
      <div class="footer-top">
        ${title ? `<h1>${title}</h1>` : ''}
        <a href="#" class="back-btn">&larr; Back</a>
      </div>
      ${description ? `<p>${description}</p>` : ''}
    </footer>
  `;
  await mount(document.getElementById('viz')!);
}

async function route(): Promise<void> {
  const name = window.location.hash.slice(1);
  if (name) {
    await renderVisualization(name);
  } else {
    renderLanding();
  }
}

window.addEventListener('hashchange', route);
route();
