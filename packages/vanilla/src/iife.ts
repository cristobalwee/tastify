export { mount } from './mount.js';
export type { MountOptions, MountedWidget } from './mount.js';

import { autoInit } from './auto-init.js';

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => autoInit());
  } else {
    requestAnimationFrame(() => autoInit());
  }
}
