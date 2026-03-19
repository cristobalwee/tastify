interface CacheEntry<T> {
  data: T;
  createdAt: number;
  softTTL: number;
  hardTTL: number;
}

export class Cache {
  private entries = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    const age = Date.now() - entry.createdAt;
    if (age > entry.hardTTL) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, softTTL: number, hardTTL: number): void {
    this.entries.set(key, {
      data,
      createdAt: Date.now(),
      softTTL,
      hardTTL,
    });
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    softTTL: number,
    hardTTL: number,
  ): Promise<T> {
    const entry = this.entries.get(key) as CacheEntry<T> | undefined;

    if (entry) {
      const age = Date.now() - entry.createdAt;

      // Fresh: within soft TTL
      if (age <= entry.softTTL) {
        return entry.data;
      }

      // Stale: between soft and hard TTL — return stale + background revalidate
      if (age <= entry.hardTTL) {
        this.backgroundRevalidate(key, fetcher, softTTL, hardTTL);
        return entry.data;
      }
    }

    // Expired or missing: blocking fetch with dedup
    return this.dedupFetch(key, fetcher, softTTL, hardTTL);
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.inflight.clear();
  }

  private async dedupFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    softTTL: number,
    hardTTL: number,
  ): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, softTTL, hardTTL);
        return data;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  private backgroundRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    softTTL: number,
    hardTTL: number,
  ): void {
    if (this.inflight.has(key)) return;

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, softTTL, hardTTL);
        return data;
      })
      .catch(() => {
        // Silently keep stale data on background revalidation failure
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
  }
}
