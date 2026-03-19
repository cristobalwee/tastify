export interface Poller {
  start(): void;
  stop(): void;
  isRunning: boolean;
}

export function createPoller(fn: () => void | Promise<void>, intervalMs: number): Poller {
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (timer !== null) return;
      fn();
      timer = setInterval(fn, intervalMs);
    },
    stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
    get isRunning() {
      return timer !== null;
    },
  };
}
