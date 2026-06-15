export function makeCopyable(el: HTMLElement, text: string): void {
  el.classList.add('copyable');
  el.title = text;
  el.addEventListener('click', async e => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); } catch { return; }
    const me = e as MouseEvent;
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = 'Copied!';
    toast.style.left = `${me.clientX}px`;
    toast.style.top = `${me.clientY - 36}px`;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 1100);
  });
}

export function makeChip(text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'chip';
  el.textContent = text;
  el.title = text;
  return el;
}

export function formatTimestamp(ts: number | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return `${d.toISOString().slice(0, 10)}\n${d.toISOString().slice(11, 19)}`;
}

export function formatDateString(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.indexOf('T');
  return t === -1 ? s : `${s.slice(0, t)}\n${s.slice(t + 1, t + 9)}`;
}
