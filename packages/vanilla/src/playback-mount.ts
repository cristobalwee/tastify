import { getAudioPlayer } from '@tastify/core';
import { replaceChildren } from './renderer.js';
import {
  renderPlaybackBar,
  renderPlaybackToast,
  type ToastPosition,
} from './playback-templates.js';

export interface PlaybackBarMountOptions {
  container?: HTMLElement;
}

export interface PlaybackToastMountOptions {
  position?: ToastPosition;
  container?: HTMLElement;
}

export interface PlaybackWidget {
  update(opts?: Record<string, unknown>): void;
  destroy(): void;
}

export function mountPlaybackBar(options?: PlaybackBarMountOptions): PlaybackWidget {
  const container = options?.container ?? document.createElement('div');
  if (!options?.container) {
    document.body.appendChild(container);
  }

  const player = getAudioPlayer();
  let destroyed = false;

  function render() {
    if (destroyed) return;
    const state = player.getState();
    if (!state.currentTrack) {
      container.textContent = '';
      return;
    }
    const el = renderPlaybackBar(state, {
      onTogglePlayPause: () => player.togglePlayPause(),
      onNext: () => player.next(),
      onPrevious: () => player.previous(),
      onSeek: (f) => player.seek(f),
      onClose: () => player.stop(),
    });
    replaceChildren(container, [el]);
  }

  const unsub1 = player.subscribe('statechange', render);
  const unsub2 = player.subscribe('trackchange', render);
  render();

  return {
    update() {
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsub1();
      unsub2();
      container.textContent = '';
      if (!options?.container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

export function mountPlaybackToast(options?: PlaybackToastMountOptions): PlaybackWidget {
  let position = options?.position ?? 'bottom-right';
  const container = options?.container ?? document.createElement('div');
  if (!options?.container) {
    document.body.appendChild(container);
  }

  const player = getAudioPlayer();
  let destroyed = false;

  function render() {
    if (destroyed) return;
    const state = player.getState();
    if (!state.currentTrack) {
      container.textContent = '';
      return;
    }
    const el = renderPlaybackToast(state, position, {
      onTogglePlayPause: () => player.togglePlayPause(),
      onNext: () => player.next(),
      onPrevious: () => player.previous(),
      onSeek: (f) => player.seek(f),
      onClose: () => player.stop(),
    });
    replaceChildren(container, [el]);
  }

  const unsub1 = player.subscribe('statechange', render);
  const unsub2 = player.subscribe('trackchange', render);
  render();

  return {
    update(opts?: Record<string, unknown>) {
      if (opts?.position && typeof opts.position === 'string') {
        position = opts.position as ToastPosition;
      }
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsub1();
      unsub2();
      container.textContent = '';
      if (!options?.container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}
