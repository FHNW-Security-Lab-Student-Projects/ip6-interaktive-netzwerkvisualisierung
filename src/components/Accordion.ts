export interface AccordionItem {
  label: string;
  content: HTMLElement | string;
  open?: boolean;
  disabled?: boolean;
}

const chevronSvg = `<svg class="accordion-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 5L7 9L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function createAccordion(items: AccordionItem[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'accordion';

  for (const item of items) {
    const wrapper = document.createElement('div');
    wrapper.className = 'accordion-item';

    const header = document.createElement('button');
    header.type = 'button';

    if (item.disabled) {
      header.className = 'accordion-header accordion-header--disabled';
      header.disabled = true;
      header.setAttribute('aria-disabled', 'true');
      header.setAttribute('aria-expanded', 'false');
    } else {
      header.className = 'accordion-header';
      header.setAttribute('aria-expanded', item.open ? 'true' : 'false');
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'accordion-label';
    labelSpan.textContent = item.label;

    header.append(labelSpan);
    header.insertAdjacentHTML('beforeend', chevronSvg);

    const contentEl = document.createElement('div');
    contentEl.className = (!item.disabled && item.open) ? 'accordion-content open' : 'accordion-content';

    if (typeof item.content === 'string') {
      contentEl.textContent = item.content;
    } else {
      contentEl.append(item.content);
    }

    if (!item.disabled) {
      header.addEventListener('click', () => {
        const isOpen = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        contentEl.classList.toggle('open', !isOpen);
      });
    }

    wrapper.append(header, contentEl);
    container.append(wrapper);
  }

  return container;
}
