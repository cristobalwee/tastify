import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../mount.js', () => ({
  mount: vi.fn(),
}));

import { mount } from '../mount.js';
import { autoInit } from '../auto-init.js';

const mockMount = vi.mocked(mount);

describe('autoInit()', () => {
  beforeEach(() => {
    mockMount.mockClear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('finds elements with [data-tastify] and mounts them', () => {
    document.body.innerHTML = `
      <script data-tastify-token-url="/api/token"></script>
      <div data-tastify="now-playing" data-compact="true"></div>
    `;

    autoInit();

    expect(mockMount).toHaveBeenCalledTimes(1);
    const [el, opts] = mockMount.mock.calls[0]!;
    expect((el as HTMLElement).getAttribute('data-tastify')).toBe('now-playing');
    expect(opts).toMatchObject({
      type: 'now-playing',
      tokenUrl: '/api/token',
      compact: true,
    });
  });

  it('converts kebab-case to camelCase', () => {
    document.body.innerHTML = `
      <script data-tastify-token-url="/api/token"></script>
      <div data-tastify="top-tracks" data-time-range="short_term" data-show-rank="true"></div>
    `;

    autoInit();

    const opts = mockMount.mock.calls[0]![1] as Record<string, unknown>;
    expect(opts['timeRange']).toBe('short_term');
    expect(opts['showRank']).toBe(true);
  });

  it('parses numeric strings as numbers', () => {
    document.body.innerHTML = `
      <script data-tastify-token-url="/api/token"></script>
      <div data-tastify="top-tracks" data-limit="5" data-columns="3"></div>
    `;

    autoInit();

    const opts = mockMount.mock.calls[0]![1] as Record<string, unknown>;
    expect(opts['limit']).toBe(5);
    expect(opts['columns']).toBe(3);
  });

  it('parses "false" as boolean false', () => {
    document.body.innerHTML = `
      <script data-tastify-token-url="/api/token"></script>
      <div data-tastify="now-playing" data-show-art="false"></div>
    `;

    autoInit();

    const opts = mockMount.mock.calls[0]![1] as Record<string, unknown>;
    expect(opts['showArt']).toBe(false);
  });

  it('mounts multiple widgets', () => {
    document.body.innerHTML = `
      <script data-tastify-token-url="/api/token"></script>
      <div data-tastify="now-playing"></div>
      <div data-tastify="top-tracks" data-limit="10"></div>
      <div data-tastify="top-artists" data-layout="list"></div>
    `;

    autoInit();

    expect(mockMount).toHaveBeenCalledTimes(3);
  });

  it('does not break when no elements exist', () => {
    document.body.innerHTML = '<div>No widgets here</div>';

    expect(() => autoInit()).not.toThrow();
    expect(mockMount).not.toHaveBeenCalled();
  });

  it('works without a global token URL', () => {
    document.body.innerHTML = `
      <div data-tastify="now-playing"></div>
    `;

    autoInit();

    expect(mockMount).toHaveBeenCalledTimes(1);
    const opts = mockMount.mock.calls[0]![1] as Record<string, unknown>;
    expect(opts['tokenUrl']).toBeUndefined();
  });

  it('preserves string values that are not booleans or numbers', () => {
    document.body.innerHTML = `
      <script data-tastify-token-url="/api/token"></script>
      <div data-tastify="top-tracks" data-header="On Repeat" data-layout="grid"></div>
    `;

    autoInit();

    const opts = mockMount.mock.calls[0]![1] as Record<string, unknown>;
    expect(opts['header']).toBe('On Repeat');
    expect(opts['layout']).toBe('grid');
  });
});
