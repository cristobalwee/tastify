import { describe, it, expect } from 'vitest';
import { h, text, setStyles, replaceChildren } from '../renderer.js';

describe('h()', () => {
  it('creates an element with the given tag', () => {
    const el = h('div');
    expect(el.tagName).toBe('DIV');
  });

  it('sets attributes', () => {
    const el = h('img', { src: 'test.jpg', alt: 'photo', class: 'card' });
    expect(el.getAttribute('src')).toBe('test.jpg');
    expect(el.getAttribute('alt')).toBe('photo');
    expect(el.className).toBe('card');
  });

  it('appends string children as text nodes', () => {
    const el = h('span', {}, ['hello']);
    expect(el.textContent).toBe('hello');
    expect(el.childNodes[0]!.nodeType).toBe(Node.TEXT_NODE);
  });

  it('appends element children', () => {
    const child = h('span', { class: 'inner' });
    const parent = h('div', { class: 'outer' }, [child]);
    expect(parent.children[0]).toBe(child);
  });

  it('appends Text node children', () => {
    const t = text('hello');
    const el = h('p', {}, [t]);
    expect(el.textContent).toBe('hello');
  });

  it('handles mixed children', () => {
    const el = h('div', {}, ['text', h('span'), text('more')]);
    expect(el.childNodes.length).toBe(3);
  });
});

describe('text()', () => {
  it('creates a Text node', () => {
    const t = text('hello');
    expect(t.nodeType).toBe(Node.TEXT_NODE);
    expect(t.textContent).toBe('hello');
  });
});

describe('setStyles()', () => {
  it('sets style properties', () => {
    const el = h('div');
    setStyles(el, { width: '50%', color: 'red' });
    expect(el.style.width).toBe('50%');
    expect(el.style.color).toBe('red');
  });
});

describe('replaceChildren()', () => {
  it('replaces existing children', () => {
    const parent = h('div', {}, [h('span', {}, ['old'])]);
    const newChild = h('p', {}, ['new']);
    replaceChildren(parent, [newChild]);
    expect(parent.children.length).toBe(1);
    expect(parent.children[0]!.tagName).toBe('P');
    expect(parent.textContent).toBe('new');
  });
});
