import './api/client.ts';

export type Visualization = {
  mount(container: HTMLElement): Promise<void>;
};

const modules = import.meta.glob<Visualization>('./visualizations/*.ts');

function nameFromPath(path: string): string {
  return path.replace('./visualizations/', '').replace('.ts', '');
}

function toDisplayName(name: string): string {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

const app = document.getElementById('app')!;

function renderLanding(): void {
  const names = Object.keys(modules).map(nameFromPath);
  app.innerHTML = `
    <h1>Network Visualizations</h1>
    <ul>
      ${names.map(name => `<li><a href="#${name}">${toDisplayName(name)}</a></li>`).join('')}
    </ul>
  `;
}

async function renderVisualization(name: string): Promise<void> {
  const path = `./visualizations/${name}.ts`;
  const load = modules[path];
  if (!load) {
    window.location.hash = '';
    return;
  }
  app.innerHTML = '<div id="viz" style="width: 100vw; height: 100vh;"></div>';
  const { mount } = await load();
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
