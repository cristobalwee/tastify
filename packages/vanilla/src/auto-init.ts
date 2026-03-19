import { mount } from './mount.js';
import type { MountOptions } from './mount.js';

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function parseValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== '') return num;
  return value;
}

export function autoInit(): void {
  // Find the script tag that loaded tastify
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[data-tastify-token-url]',
  );

  let globalTokenUrl: string | undefined;
  for (const script of scripts) {
    const url = script.getAttribute('data-tastify-token-url');
    if (url) {
      globalTokenUrl = url;
      break;
    }
  }

  const elements = document.querySelectorAll<HTMLElement>('[data-tastify]');

  for (const el of elements) {
    const type = el.getAttribute('data-tastify') as MountOptions['type'];
    if (!type) continue;

    const opts: Record<string, unknown> = { type };

    if (globalTokenUrl) {
      opts['tokenUrl'] = globalTokenUrl;
    }

    // Parse data attributes into options
    for (const attr of el.attributes) {
      if (attr.name === 'data-tastify') continue;
      if (!attr.name.startsWith('data-')) continue;

      const key = kebabToCamel(attr.name.slice(5)); // strip "data-"
      opts[key] = parseValue(attr.value);
    }

    mount(el, opts as unknown as MountOptions);
  }
}
