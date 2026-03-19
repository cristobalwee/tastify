import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPoller } from '../poller.js';

describe('createPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('start calls fn immediately', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);

    poller.start();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('interval fires fn repeatedly', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);

    poller.start();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(3);

    poller.stop();
  });

  it('stop clears the interval', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);

    poller.start();
    poller.stop();
    fn.mockClear();

    vi.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('isRunning reflects state', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);

    expect(poller.isRunning).toBe(false);
    poller.start();
    expect(poller.isRunning).toBe(true);
    poller.stop();
    expect(poller.isRunning).toBe(false);
  });

  it('double-start is a no-op', () => {
    const fn = vi.fn();
    const poller = createPoller(fn, 1000);

    poller.start();
    poller.start();
    expect(fn).toHaveBeenCalledOnce();

    poller.stop();
  });
});
