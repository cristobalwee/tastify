/// <reference path="./spotify-sdk.d.ts" />
/// <reference path="./spotify-embed.d.ts" />

import type { TastifyTrack } from './types.js';
import { loadSpotifySDK } from './sdk-loader.js';
import { loadSpotifyEmbed } from './embed-loader.js';
import { startPlayback, transferPlayback } from './endpoints.js';

export type PlaybackMode = 'preview' | 'sdk' | 'embed';

export interface PlaybackState {
  currentTrack: TastifyTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  playbackMode: PlaybackMode;
}

export type PlaybackEvent = 'statechange' | 'trackchange' | 'ended';

export interface AudioPlayer {
  play(track: TastifyTrack): void;
  pause(): void;
  resume(): void;
  togglePlayPause(): void;
  seek(fraction: number): void;
  getState(): PlaybackState;
  subscribe(event: PlaybackEvent, cb: () => void): () => void;
  setQueue(tracks: TastifyTrack[], startIndex?: number): void;
  next(): void;
  previous(): void;
  stop(): void;
  destroy(): void;
}

export interface SDKPlayerOptions {
  getToken: () => Promise<string>;
  deviceName?: string;
  volume?: number;
  onPremiumRequired?: () => void;
}

// --- Preview-URL player (existing implementation) ---

function createAudioPlayer(): AudioPlayer {
  const audio = new Audio();
  audio.preload = 'auto';

  let currentTrack: TastifyTrack | null = null;
  let queue: TastifyTrack[] = [];
  let queueIndex = -1;

  const listeners = new Map<PlaybackEvent, Set<() => void>>();
  listeners.set('statechange', new Set());
  listeners.set('trackchange', new Set());
  listeners.set('ended', new Set());

  function emit(event: PlaybackEvent): void {
    const cbs = listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb();
      }
    }
  }

  audio.addEventListener('timeupdate', () => emit('statechange'));
  audio.addEventListener('play', () => emit('statechange'));
  audio.addEventListener('pause', () => emit('statechange'));
  audio.addEventListener('loadedmetadata', () => emit('statechange'));

  audio.addEventListener('ended', () => {
    emit('ended');
    // Auto-advance to next track in queue
    if (queueIndex < queue.length - 1) {
      playIndex(queueIndex + 1);
    } else {
      emit('statechange');
    }
  });

  function playIndex(index: number): void {
    if (index < 0 || index >= queue.length) return;

    // Find the next track with a preview URL
    let targetIndex = index;
    const direction = index >= queueIndex ? 1 : -1;
    while (
      targetIndex >= 0 &&
      targetIndex < queue.length &&
      !queue[targetIndex]!.previewUrl
    ) {
      targetIndex += direction;
    }
    if (targetIndex < 0 || targetIndex >= queue.length || !queue[targetIndex]!.previewUrl) return;

    queueIndex = targetIndex;
    currentTrack = queue[targetIndex]!;
    audio.src = currentTrack.previewUrl!;
    audio.play().catch(() => {});
    emit('trackchange');
    emit('statechange');
  }

  const player: AudioPlayer = {
    play(track: TastifyTrack): void {
      if (!track.previewUrl) return;

      // If this track is already in the queue, just navigate to it
      const existingIndex = queue.findIndex((t) => t.id === track.id);
      if (existingIndex !== -1) {
        playIndex(existingIndex);
        return;
      }

      currentTrack = track;
      queue = [track];
      queueIndex = 0;
      audio.src = track.previewUrl;
      audio.play().catch(() => {});
      emit('trackchange');
      emit('statechange');
    },

    pause(): void {
      audio.pause();
    },

    resume(): void {
      audio.play().catch(() => {});
    },

    togglePlayPause(): void {
      if (audio.paused && currentTrack) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    },

    seek(fraction: number): void {
      if (audio.duration && isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, Math.min(1, fraction)) * audio.duration;
      }
    },

    getState(): PlaybackState {
      const duration = isFinite(audio.duration) ? audio.duration : 0;
      return {
        currentTrack,
        isPlaying: !audio.paused && !!currentTrack,
        progress: duration > 0 ? audio.currentTime / duration : 0,
        duration,
        currentTime: audio.currentTime,
        playbackMode: 'preview',
      };
    },

    subscribe(event: PlaybackEvent, cb: () => void): () => void {
      const cbs = listeners.get(event);
      if (cbs) {
        cbs.add(cb);
      }
      return () => {
        cbs?.delete(cb);
      };
    },

    setQueue(tracks: TastifyTrack[], startIndex = 0): void {
      queue = [...tracks];
      queueIndex = startIndex;
      if (queue.length > 0 && startIndex >= 0 && startIndex < queue.length) {
        playIndex(startIndex);
      }
    },

    next(): void {
      if (queueIndex < queue.length - 1) {
        playIndex(queueIndex + 1);
      }
    },

    previous(): void {
      // If we're more than 3 seconds in, restart the track
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      if (queueIndex > 0) {
        playIndex(queueIndex - 1);
      }
    },

    stop(): void {
      audio.pause();
      audio.src = '';
      currentTrack = null;
      queue = [];
      queueIndex = -1;
      emit('trackchange');
      emit('statechange');
    },

    destroy(): void {
      player.stop();
      for (const cbs of listeners.values()) {
        cbs.clear();
      }
    },
  };

  return player;
}

// --- Web Playback SDK player ---

async function createSDKPlayer(options: SDKPlayerOptions): Promise<AudioPlayer> {
  await loadSpotifySDK();

  const listeners = new Map<PlaybackEvent, Set<() => void>>();
  listeners.set('statechange', new Set());
  listeners.set('trackchange', new Set());
  listeners.set('ended', new Set());

  function emit(event: PlaybackEvent): void {
    const cbs = listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb();
      }
    }
  }

  let deviceId: string | null = null;
  let currentTrack: TastifyTrack | null = null;
  let queue: TastifyTrack[] = [];
  let queueIndex = -1;
  let cachedState: Spotify.WebPlaybackState | null = null;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  // Map track URIs to TastifyTrack objects for metadata resolution
  const trackMap = new Map<string, TastifyTrack>();

  const spotifyPlayer = new Spotify.Player({
    name: options.deviceName ?? 'Tastify Web Player',
    getOAuthToken: (cb) => {
      options.getToken().then(cb).catch(() => {});
    },
    volume: options.volume ?? 0.5,
  });

  function startProgressPolling(): void {
    if (progressInterval) return;
    progressInterval = setInterval(() => {
      spotifyPlayer.getCurrentState().then((state) => {
        if (state) {
          const prevTrackUri = cachedState?.track_window.current_track.uri;
          cachedState = state;
          if (state.track_window.current_track.uri !== prevTrackUri) {
            currentTrack = trackMap.get(state.track_window.current_track.uri) ?? currentTrack;
            emit('trackchange');
          }
          emit('statechange');
        }
      }).catch(() => {});
    }, 500);
  }

  function stopProgressPolling(): void {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  // Handle SDK events
  spotifyPlayer.addListener('player_state_changed', (state) => {
    if (!state) {
      cachedState = null;
      emit('statechange');
      stopProgressPolling();
      return;
    }

    const prevTrackUri = cachedState?.track_window.current_track.uri;
    const wasPlaying = cachedState ? !cachedState.paused : false;
    cachedState = state;

    // Track changed
    if (state.track_window.current_track.uri !== prevTrackUri) {
      currentTrack = trackMap.get(state.track_window.current_track.uri) ?? currentTrack;
      emit('trackchange');
    }

    // Track ended (was playing, now paused at position 0, no next tracks)
    if (
      wasPlaying &&
      state.paused &&
      state.position === 0 &&
      state.track_window.next_tracks.length === 0
    ) {
      emit('ended');
      stopProgressPolling();
    } else if (!state.paused) {
      startProgressPolling();
    } else {
      stopProgressPolling();
    }

    emit('statechange');
  });

  spotifyPlayer.addListener('account_error', () => {
    options.onPremiumRequired?.();
  });

  // Connect and wait for device_id
  const connected = await new Promise<boolean>((resolve) => {
    spotifyPlayer.addListener('ready', ({ device_id }) => {
      deviceId = device_id;
      resolve(true);
    });

    spotifyPlayer.addListener('initialization_error', () => resolve(false));
    spotifyPlayer.addListener('authentication_error', () => resolve(false));

    spotifyPlayer.connect().then((ok) => {
      if (!ok) resolve(false);
    });
  });

  if (!connected) {
    spotifyPlayer.disconnect();
    throw new Error('Failed to connect Spotify Web Playback SDK');
  }

  // Helper: try startPlayback, if 404 activate the device first and retry
  let deviceActivated = false;
  async function ensurePlayback(token: string, uris: string[], positionMs = 0, offset = 0): Promise<void> {
    if (!deviceActivated) {
      try {
        await transferPlayback(token, deviceId!, false);
        deviceActivated = true;
      } catch {
        // best-effort — may fail if no prior session exists
      }
    }
    try {
      await startPlayback(token, deviceId!, uris, positionMs, offset);
    } catch {
      // Retry once after activating the device
      await transferPlayback(token, deviceId!, false);
      deviceActivated = true;
      await startPlayback(token, deviceId!, uris, positionMs, offset);
    }
  }

  const player: AudioPlayer = {
    play(track: TastifyTrack): void {
      if (!deviceId) return;
      trackMap.set(track.uri, track);
      currentTrack = track;
      queue = [track];
      queueIndex = 0;

      options.getToken().then((token) =>
        ensurePlayback(token, [track.uri])
      ).catch(() => {});

      emit('trackchange');
      emit('statechange');
    },

    pause(): void {
      spotifyPlayer.pause().catch(() => {});
    },

    resume(): void {
      spotifyPlayer.resume().catch(() => {});
    },

    togglePlayPause(): void {
      spotifyPlayer.togglePlay().catch(() => {});
    },

    seek(fraction: number): void {
      const durationMs = cachedState?.duration ?? 0;
      if (durationMs > 0) {
        const positionMs = Math.max(0, Math.min(1, fraction)) * durationMs;
        spotifyPlayer.seek(positionMs).catch(() => {});
      }
    },

    getState(): PlaybackState {
      if (!cachedState) {
        return {
          currentTrack,
          isPlaying: false,
          progress: 0,
          duration: 0,
          currentTime: 0,
          playbackMode: 'sdk',
        };
      }

      const durationSec = cachedState.duration / 1000;
      const currentTimeSec = cachedState.position / 1000;

      return {
        currentTrack,
        isPlaying: !cachedState.paused,
        progress: durationSec > 0 ? currentTimeSec / durationSec : 0,
        duration: durationSec,
        currentTime: currentTimeSec,
        playbackMode: 'sdk',
      };
    },

    subscribe(event: PlaybackEvent, cb: () => void): () => void {
      const cbs = listeners.get(event);
      if (cbs) {
        cbs.add(cb);
      }
      return () => {
        cbs?.delete(cb);
      };
    },

    setQueue(tracks: TastifyTrack[], startIndex = 0): void {
      if (!deviceId) return;
      queue = [...tracks];
      queueIndex = startIndex;

      for (const t of tracks) {
        trackMap.set(t.uri, t);
      }

      if (queue.length > 0 && startIndex >= 0 && startIndex < queue.length) {
        currentTrack = queue[startIndex]!;
        const uris = queue.map((t) => t.uri);

        options.getToken().then((token) =>
          ensurePlayback(token, uris, 0, startIndex)
        ).catch(() => {});

        emit('trackchange');
        emit('statechange');
      }
    },

    next(): void {
      spotifyPlayer.nextTrack().catch(() => {});
    },

    previous(): void {
      const currentTimeSec = cachedState ? cachedState.position / 1000 : 0;
      if (currentTimeSec > 3) {
        spotifyPlayer.seek(0).catch(() => {});
        return;
      }
      spotifyPlayer.previousTrack().catch(() => {});
    },

    stop(): void {
      spotifyPlayer.pause().catch(() => {});
      stopProgressPolling();
      currentTrack = null;
      queue = [];
      queueIndex = -1;
      cachedState = null;
      trackMap.clear();
      emit('trackchange');
      emit('statechange');
    },

    destroy(): void {
      player.stop();
      spotifyPlayer.disconnect();
      for (const cbs of listeners.values()) {
        cbs.clear();
      }
    },
  };

  return player;
}

// --- Spotify Embed (IFrame) player ---

async function createEmbedPlayer(): Promise<AudioPlayer> {
  const api = await loadSpotifyEmbed();

  const listeners = new Map<PlaybackEvent, Set<() => void>>();
  listeners.set('statechange', new Set());
  listeners.set('trackchange', new Set());
  listeners.set('ended', new Set());

  function emit(event: PlaybackEvent): void {
    const cbs = listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        cb();
      }
    }
  }

  let currentTrack: TastifyTrack | null = null;
  let queue: TastifyTrack[] = [];
  let queueIndex = -1;
  let isPaused = true;
  let position = 0;
  let duration = 0;
  let loadSeq = 0;
  let ended = false;

  // Create a hidden container for the embed iframe
  const container = document.createElement('div');
  container.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px;opacity:0;pointer-events:none;';
  document.body.appendChild(container);

  const controller = await new Promise<SpotifyEmbedController>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Spotify Embed controller creation timed out'));
    }, 10_000);

    try {
      api.createController(container, { width: 1, height: 1 }, (ctrl) => {
        clearTimeout(timeout);
        resolve(ctrl);
      });
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });

  controller.addListener('playback_update', (e) => {
    const { isPaused: paused, position: pos, duration: dur } = e.data;
    isPaused = paused;
    position = pos;
    duration = dur;

    // Detect track ended: was playing, now paused, near the end
    if (paused && dur > 0 && pos >= dur - 0.5 && !ended) {
      ended = true;
      emit('ended');
      // Auto-advance to next track in queue
      if (queueIndex < queue.length - 1) {
        playIndex(queueIndex + 1);
      }
    }

    emit('statechange');
  });

  function playIndex(index: number): void {
    if (index < 0 || index >= queue.length) return;
    queueIndex = index;
    currentTrack = queue[index]!;
    ended = false;
    loadSeq++;
    controller.loadUri(`spotify:track:${currentTrack.id}`);
    controller.play();
    emit('trackchange');
    emit('statechange');
  }

  const player: AudioPlayer = {
    play(track: TastifyTrack): void {
      // If this track is already in the queue, navigate to it
      const existingIndex = queue.findIndex((t) => t.id === track.id);
      if (existingIndex !== -1) {
        playIndex(existingIndex);
        return;
      }

      currentTrack = track;
      queue = [track];
      queueIndex = 0;
      ended = false;
      loadSeq++;
      controller.loadUri(`spotify:track:${track.id}`);
      controller.play();
      emit('trackchange');
      emit('statechange');
    },

    pause(): void {
      controller.pause();
    },

    resume(): void {
      controller.resume();
    },

    togglePlayPause(): void {
      controller.togglePlay();
    },

    seek(fraction: number): void {
      if (duration > 0) {
        const seconds = Math.max(0, Math.min(1, fraction)) * duration;
        controller.seek(seconds);
      }
    },

    getState(): PlaybackState {
      return {
        currentTrack,
        isPlaying: !isPaused && !!currentTrack,
        progress: duration > 0 ? position / duration : 0,
        duration,
        currentTime: position,
        playbackMode: 'embed',
      };
    },

    subscribe(event: PlaybackEvent, cb: () => void): () => void {
      const cbs = listeners.get(event);
      if (cbs) {
        cbs.add(cb);
      }
      return () => {
        cbs?.delete(cb);
      };
    },

    setQueue(tracks: TastifyTrack[], startIndex = 0): void {
      queue = [...tracks];
      queueIndex = startIndex;
      if (queue.length > 0 && startIndex >= 0 && startIndex < queue.length) {
        playIndex(startIndex);
      }
    },

    next(): void {
      if (queueIndex < queue.length - 1) {
        playIndex(queueIndex + 1);
      }
    },

    previous(): void {
      // If we're more than 3 seconds in, restart the track
      if (position > 3) {
        controller.seek(0);
        return;
      }
      if (queueIndex > 0) {
        playIndex(queueIndex - 1);
      }
    },

    stop(): void {
      controller.pause();
      currentTrack = null;
      queue = [];
      queueIndex = -1;
      isPaused = true;
      position = 0;
      duration = 0;
      ended = false;
      emit('trackchange');
      emit('statechange');
    },

    destroy(): void {
      player.stop();
      controller.destroy();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      for (const cbs of listeners.values()) {
        cbs.clear();
      }
    },
  };

  return player;
}

// --- Singleton management ---

let instance: AudioPlayer | null = null;
let pendingAsync: Promise<AudioPlayer> | null = null;

export function getAudioPlayer(): AudioPlayer {
  if (!instance) {
    instance = createAudioPlayer();
  }
  return instance;
}

/**
 * Creates an SDK-backed audio player (requires Spotify Premium).
 * Falls back to the preview player if the SDK fails to connect.
 */
export async function getOrCreateSDKPlayer(options: SDKPlayerOptions): Promise<AudioPlayer> {
  if (instance) {
    return instance;
  }
  // Deduplicate concurrent calls (e.g. React StrictMode double-mount)
  if (pendingAsync) {
    return pendingAsync;
  }

  pendingAsync = (async () => {
    try {
      instance = await createSDKPlayer(options);
    } catch {
      options.onPremiumRequired?.();
      instance = createAudioPlayer();
    }
    pendingAsync = null;
    return instance!;
  })();

  return pendingAsync;
}

/**
 * Creates an embed-backed audio player using the Spotify IFrame API.
 * Plays ~30-second previews without requiring authentication.
 * Falls back to the preview player if the embed API fails to load.
 */
export async function getOrCreateEmbedPlayer(): Promise<AudioPlayer> {
  if (instance) {
    return instance;
  }
  if (pendingAsync) {
    return pendingAsync;
  }

  pendingAsync = (async () => {
    try {
      instance = await createEmbedPlayer();
    } catch {
      instance = createAudioPlayer();
    }
    pendingAsync = null;
    return instance!;
  })();

  return pendingAsync;
}

export function resetAudioPlayer(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
