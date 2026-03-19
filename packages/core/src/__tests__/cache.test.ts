import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../cache.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new Cache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('returns cached data within hard TTL', () => {
    cache.set('key', 'value', 1000, 3000);
    expect(cache.get('key')).toBe('value');
  });

  it('returns undefined after hard TTL expires', () => {
    cache.set('key', 'value', 1000, 3000);
    vi.advanceTimersByTime(3001);
    expect(cache.get('key')).toBeUndefined();
  });

  it('getOrFetch returns fresh cached data without fetching', async () => {
    const fetcher = vi.fn().mockResolvedValue('fetched');
    cache.set('key', 'cached', 5000, 15000);

    const result = await cache.getOrFetch('key', fetcher, 5000, 15000);
    expect(result).toBe('cached');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('getOrFetch returns stale data and triggers background revalidation (SWR)', async () => {
    const fetcher = vi.fn().mockResolvedValue('fresh');
    cache.set('key', 'stale', 1000, 5000);

    // Advance past soft TTL but within hard TTL
    vi.advanceTimersByTime(1500);

    const result = await cache.getOrFetch('key', fetcher, 1000, 5000);
    expect(result).toBe('stale');
    expect(fetcher).toHaveBeenCalledOnce();

    // Let the background fetch resolve
    await vi.advanceTimersByTimeAsync(0);
    expect(cache.get('key')).toBe('fresh');
  });

  it('SWR failure silently keeps stale data', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'));
    cache.set('key', 'stale', 1000, 5000);

    vi.advanceTimersByTime(1500);

    const result = await cache.getOrFetch('key', fetcher, 1000, 5000);
    expect(result).toBe('stale');

    await vi.advanceTimersByTimeAsync(0);
    // Stale data should still be there (not deleted)
    expect(cache.get('key')).toBe('stale');
  });

  it('getOrFetch does a blocking fetch when expired', async () => {
    const fetcher = vi.fn().mockResolvedValue('new-data');
    cache.set('key', 'old', 1000, 3000);

    vi.advanceTimersByTime(3001);

    const result = await cache.getOrFetch('key', fetcher, 1000, 3000);
    expect(result).toBe('new-data');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent calls to the same key', async () => {
    let resolvePromise: (val: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolvePromise = resolve; }),
    );

    const p1 = cache.getOrFetch('key', fetcher, 1000, 3000);
    const p2 = cache.getOrFetch('key', fetcher, 1000, 3000);

    expect(fetcher).toHaveBeenCalledOnce();

    resolvePromise!('data');
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('data');
    expect(r2).toBe('data');
  });

  it('invalidate removes a specific key', () => {
    cache.set('a', 1, 5000, 15000);
    cache.set('b', 2, 5000, 15000);
    cache.invalidate('a');
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
  });

  it('clear removes all entries', () => {
    cache.set('a', 1, 5000, 15000);
    cache.set('b', 2, 5000, 15000);
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
