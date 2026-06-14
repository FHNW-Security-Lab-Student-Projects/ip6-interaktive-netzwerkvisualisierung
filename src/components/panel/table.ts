export function buildPaginatedTable(
  headers: string[],
  rows: HTMLTableRowElement[],
  pageSize = 25,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';

  const table = document.createElement('table');
  table.className = 'panel-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.append(th);
  }
  thead.append(headerRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  table.append(tbody);
  wrapper.append(table);

  let page = 0;
  const totalPages = Math.ceil(rows.length / pageSize);

  let footer: HTMLElement | null = null;
  if (rows.length > pageSize) {
    footer = document.createElement('div');
    footer.className = 'table-footer';
    footer.innerHTML = `
      <span class="page-size">Rows per page: ${pageSize}</span>
      <span class="page-info"></span>
      <button class="btn-prev" type="button">&#8249;</button>
      <button class="btn-next" type="button">&#8250;</button>
    `;
    footer.querySelector('.btn-prev')!.addEventListener('click', () => {
      if (page > 0) { page--; renderPage(); }
    });
    footer.querySelector('.btn-next')!.addEventListener('click', () => {
      if (page < totalPages - 1) { page++; renderPage(); }
    });
    wrapper.append(footer);
  }

  const renderPage = () => {
    tbody.innerHTML = '';
    const start = page * pageSize;
    rows.slice(start, start + pageSize).forEach(r => tbody.append(r));
    if (footer) {
      footer.querySelector('.page-info')!.textContent =
        `${start + 1}–${Math.min(start + pageSize, rows.length)} of ${rows.length}`;
      (footer.querySelector('.btn-prev') as HTMLButtonElement).disabled = page === 0;
      (footer.querySelector('.btn-next') as HTMLButtonElement).disabled = page >= totalPages - 1;
    }
  };

  renderPage();
  return wrapper;
}
