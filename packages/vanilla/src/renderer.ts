export function h(
  tag: string,
  attrs?: Record<string, string>,
  children?: (string | HTMLElement | Text)[],
): HTMLElement {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }

  return el;
}

export function text(content: string): Text {
  return document.createTextNode(content);
}

export function setStyles(el: HTMLElement, styles: Record<string, string>): void {
  for (const [key, value] of Object.entries(styles)) {
    el.style.setProperty(key, value);
  }
}

export function replaceChildren(parent: HTMLElement, children: (HTMLElement | Text)[]): void {
  parent.textContent = '';
  for (const child of children) {
    parent.appendChild(child);
  }
}
