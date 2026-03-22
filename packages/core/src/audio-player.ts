import type { TastifyTrack } from './types.js';

export interface PlaybackState {
  currentTrack: TastifyTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
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

let instance: AudioPlayer | null = null;

export function getAudioPlayer(): AudioPlayer {
  if (!instance) {
    instance = createAudioPlayer();
  }
  return instance;
}

export function resetAudioPlayer(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}
