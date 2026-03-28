import { getAudioPlayer, getOrCreateSDKPlayer, getOrCreateEmbedPlayer, type AudioPlayer, type SDKPlayerOptions } from '@tastify/core';
import { replaceChildren } from './renderer.js';
import {
  renderPlaybackBar,
  renderPlaybackToast,
  type ToastPosition,
} from './playback-templates.js';

export interface PlaybackBarMountOptions {
  container?: HTMLElement;
  /** SDK options — if provided, uses Web Playback SDK instead of preview URLs. */
  sdk?: SDKPlayerOptions;
  /** Use Spotify embed iframe for playback (no auth required). Default: true. */
  embed?: boolean;
}

export interface PlaybackToastMountOptions {
  position?: ToastPosition;
  container?: HTMLElement;
  /** SDK options — if provided, uses Web Playback SDK instead of preview URLs. */
  sdk?: SDKPlayerOptions;
  /** Use Spotify embed iframe for playback (no auth required). Default: true. */
  embed?: boolean;
}

export interface PlaybackWidget {
  update(opts?: Record<string, unknown>): void;
  destroy(): void;
}

async function resolvePlayer(sdk?: SDKPlayerOptions, embed = true): Promise<AudioPlayer> {
  if (sdk) {
    try {
      return await getOrCreateSDKPlayer(sdk);
    } catch {
      sdk.onPremiumRequired?.();
      return embed ? await getOrCreateEmbedPlayer() : getAudioPlayer();
    }
  }
  if (embed) {
    return await getOrCreateEmbedPlayer();
  }
  return getAudioPlayer();
}

export function mountPlaybackBar(options?: PlaybackBarMountOptions): PlaybackWidget {
  const container = options?.container ?? document.createElement('div');
  if (!options?.container) {
    document.body.appendChild(container);
  }

  const useEmbed = options?.embed !== false;
  const needsAsync = !!(options?.sdk || useEmbed);
  let player: AudioPlayer | null = needsAsync ? null : getAudioPlayer();
  let destroyed = false;
  let unsub1: (() => void) | null = null;
  let unsub2: (() => void) | null = null;

  function render() {
    if (destroyed || !player) return;
    const state = player.getState();
    if (!state.currentTrack) {
      container.textContent = '';
      return;
    }
    const el = renderPlaybackBar(state, {
      onTogglePlayPause: () => player!.togglePlayPause(),
      onNext: () => player!.next(),
      onPrevious: () => player!.previous(),
      onSeek: (f) => player!.seek(f),
      onClose: () => player!.stop(),
    });
    replaceChildren(container, [el]);
  }

  function bind(p: AudioPlayer) {
    player = p;
    unsub1 = p.subscribe('statechange', render);
    unsub2 = p.subscribe('trackchange', render);
    render();
  }

  if (player) {
    bind(player);
  } else {
    resolvePlayer(options?.sdk, useEmbed).then((p) => {
      if (!destroyed) bind(p);
    });
  }

  return {
    update() {
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsub1?.();
      unsub2?.();
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

  const useEmbed = options?.embed !== false;
  const needsAsync = !!(options?.sdk || useEmbed);
  let player: AudioPlayer | null = needsAsync ? null : getAudioPlayer();
  let destroyed = false;
  let unsub1: (() => void) | null = null;
  let unsub2: (() => void) | null = null;

  function render() {
    if (destroyed || !player) return;
    const state = player.getState();
    if (!state.currentTrack) {
      container.textContent = '';
      return;
    }
    const el = renderPlaybackToast(state, position, {
      onTogglePlayPause: () => player!.togglePlayPause(),
      onNext: () => player!.next(),
      onPrevious: () => player!.previous(),
      onSeek: (f) => player!.seek(f),
      onClose: () => player!.stop(),
    });
    replaceChildren(container, [el]);
  }

  function bind(p: AudioPlayer) {
    player = p;
    unsub1 = p.subscribe('statechange', render);
    unsub2 = p.subscribe('trackchange', render);
    render();
  }

  if (player) {
    bind(player);
  } else {
    resolvePlayer(options?.sdk, useEmbed).then((p) => {
      if (!destroyed) bind(p);
    });
  }

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
      unsub1?.();
      unsub2?.();
      container.textContent = '';
      if (!options?.container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}
