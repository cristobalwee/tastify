import type { PlaybackState } from '@tastify/core';
import { h, setStyles } from './renderer.js';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface PlaybackControls {
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (fraction: number) => void;
  onClose: () => void;
}

function prevIcon(): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.innerHTML = '<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>';
  return svg as unknown as HTMLElement;
}

function nextIcon(): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.innerHTML = '<path d="M6 18l8.5-6L6 6v12zm8.5 0h2V6h-2v12z"/>';
  return svg as unknown as HTMLElement;
}

function playIcon(size: number): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.innerHTML = '<path d="M8 5v14l11-7z"/>';
  return svg as unknown as HTMLElement;
}

function pauseIcon(size: number): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.innerHTML = '<path d="M6 19h4V5H6zm8-14v14h4V5z"/>';
  return svg as unknown as HTMLElement;
}

function closeIcon(size: number): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.innerHTML = '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>';
  return svg as unknown as HTMLElement;
}

function makeProgressClickable(
  progressEl: HTMLElement,
  onSeek: (fraction: number) => void,
): void {
  progressEl.addEventListener('click', (e) => {
    const rect = progressEl.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(fraction);
  });
}

export function renderPlaybackBar(
  state: PlaybackState,
  controls: PlaybackControls,
): HTMLElement {
  const { currentTrack, isPlaying, progress } = state;

  const progressBar = h('div', { class: 'tf-playback-bar__progress-bar' });
  setStyles(progressBar, { width: `${progress * 100}%` });
  const progressEl = h('div', { class: 'tf-playback-bar__progress' }, [progressBar]);
  makeProgressClickable(progressEl, controls.onSeek);

  const trackChildren: (HTMLElement | Text)[] = [];
  const art = currentTrack?.album.images[0]?.url;
  if (art) {
    trackChildren.push(
      h('img', { class: 'tf-playback-bar__art', src: art, alt: currentTrack?.album.name ?? '', loading: 'lazy' }),
    );
  }
  trackChildren.push(
    h('div', { class: 'tf-playback-bar__info' }, [
      h('span', { class: 'tf-playback-bar__name' }, [currentTrack?.name ?? '']),
      h('span', { class: 'tf-playback-bar__artist' }, [
        currentTrack?.artists.map((a) => a.name).join(', ') ?? '',
      ]),
    ]),
  );

  const prevBtn = h('button', { class: 'tf-playback-bar__btn tf-playback-bar__btn--prev', 'aria-label': 'Previous' }, [prevIcon()]);
  prevBtn.addEventListener('click', controls.onPrevious);

  const playBtn = h('button', { class: 'tf-playback-bar__btn tf-playback-bar__btn--play', 'aria-label': isPlaying ? 'Pause' : 'Play' }, [
    isPlaying ? pauseIcon(28) : playIcon(28),
  ]);
  playBtn.addEventListener('click', controls.onTogglePlayPause);

  const nextBtn = h('button', { class: 'tf-playback-bar__btn tf-playback-bar__btn--next', 'aria-label': 'Next' }, [nextIcon()]);
  nextBtn.addEventListener('click', controls.onNext);

  const closeBtn = h('button', { class: 'tf-playback-bar__btn tf-playback-bar__btn--close', 'aria-label': 'Close' }, [closeIcon(18)]);
  closeBtn.addEventListener('click', controls.onClose);

  const content = h('div', { class: 'tf-playback-bar__content' }, [
    h('div', { class: 'tf-playback-bar__track' }, trackChildren),
    h('div', { class: 'tf-playback-bar__controls' }, [prevBtn, playBtn, nextBtn]),
    closeBtn,
  ]);

  return h('div', { class: 'tf-playback-bar tf-playback-bar--visible' }, [progressEl, content]);
}

export function renderPlaybackToast(
  state: PlaybackState,
  position: ToastPosition,
  controls: PlaybackControls,
): HTMLElement {
  const { currentTrack, isPlaying, progress } = state;
  const art = currentTrack?.album.images[0]?.url;

  const bodyChildren: (HTMLElement | Text)[] = [];
  if (art) {
    bodyChildren.push(
      h('img', { class: 'tf-playback-toast__art', src: art, alt: currentTrack?.album.name ?? '', loading: 'lazy' }),
    );
  }
  bodyChildren.push(
    h('div', { class: 'tf-playback-toast__info' }, [
      h('span', { class: 'tf-playback-toast__name' }, [currentTrack?.name ?? '']),
      h('span', { class: 'tf-playback-toast__artist' }, [
        currentTrack?.artists.map((a) => a.name).join(', ') ?? '',
      ]),
    ]),
  );
  const closeBtn = h('button', { class: 'tf-playback-toast__btn tf-playback-toast__btn--close', 'aria-label': 'Close' }, [closeIcon(14)]);
  closeBtn.addEventListener('click', controls.onClose);
  bodyChildren.push(closeBtn);

  const prevBtn = h('button', { class: 'tf-playback-toast__btn tf-playback-toast__btn--prev', 'aria-label': 'Previous' }, [prevIcon()]);
  prevBtn.addEventListener('click', controls.onPrevious);
  const playBtn = h('button', { class: 'tf-playback-toast__btn tf-playback-toast__btn--play', 'aria-label': isPlaying ? 'Pause' : 'Play' }, [
    isPlaying ? pauseIcon(22) : playIcon(22),
  ]);
  playBtn.addEventListener('click', controls.onTogglePlayPause);
  const nextBtn = h('button', { class: 'tf-playback-toast__btn tf-playback-toast__btn--next', 'aria-label': 'Next' }, [nextIcon()]);
  nextBtn.addEventListener('click', controls.onNext);

  const progressBar = h('div', { class: 'tf-playback-toast__progress-bar' });
  setStyles(progressBar, { width: `${progress * 100}%` });
  const progressEl = h('div', { class: 'tf-playback-toast__progress' }, [progressBar]);
  makeProgressClickable(progressEl, controls.onSeek);

  const toast = h('div', {
    class: `tf-playback-toast tf-playback-toast--${position} tf-playback-toast--visible`,
  }, [
    h('div', { class: 'tf-playback-toast__body' }, bodyChildren),
    h('div', { class: 'tf-playback-toast__controls' }, [prevBtn, playBtn, nextBtn]),
    progressEl,
  ]);

  return toast;
}
