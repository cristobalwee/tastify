import type { NowPlayingData, TastifyTrack } from './types.js';

/**
 * After load, sets px widths on `.tf-now-playing__sk-line` from the real track/artist/link
 * (or compact info row). Call when `--loaded` is set so bars match the crossfade target; while
 * loading, widths come from CSS on `:not(.tf-now-playing--loaded)` instead.
 */
export function syncNowPlayingSkeletonWidths(root: HTMLElement): void {
  const skeleton = root.querySelector<HTMLElement>('.tf-now-playing__skeleton');
  const content = root.querySelector<HTMLElement>('.tf-now-playing__content');
  if (!skeleton || !content) return;

  const setBar = (role: string, w: number) => {
    const bar = skeleton.querySelector<HTMLElement>(`[data-tf-sk="${role}"]`);
    if (!bar) return;
    bar.style.width = w > 0 ? `${Math.round(w)}px` : '';
  };

  const compact = root.classList.contains('tf-now-playing--compact');
  const info = content.querySelector<HTMLElement>('.tf-now-playing__info');

  if (compact && info) {
    setBar('row', info.getBoundingClientRect().width);
    return;
  }

  const track = content.querySelector<HTMLElement>('.tf-now-playing__track');
  const artist = content.querySelector<HTMLElement>('.tf-now-playing__artist');
  const link = content.querySelector<HTMLElement>('.tf-now-playing__link');

  setBar('track', track?.getBoundingClientRect().width ?? 0);
  setBar('artist', artist?.getBoundingClientRect().width ?? 0);
  setBar('link', link?.getBoundingClientRect().width ?? 0);
}

/**
 * Builds a now-playing payload from a recently played track when nothing is live.
 * `isPlaying` is true so the widget matches the normal “playing” presentation.
 */
export function nowPlayingFromRecentTrack(track: TastifyTrack): NowPlayingData {
  return {
    isPlaying: true,
    track,
    progressMs: 0,
    fetchedAt: Date.now(),
  };
}
