'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getAudioPlayer,
  getOrCreateSDKPlayer,
  type AudioPlayer,
  type PlaybackState,
  type PlaybackMode,
  type TastifyTrack,
  type TastifyArtist,
} from '@tastify/core';
import { useTastifyClient } from './provider.js';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PlaybackConfig {
  ui: 'bar' | 'toast';
  toastPosition?: ToastPosition;
}

export interface PlaybackContextValue {
  state: PlaybackState;
  config: PlaybackConfig;
  isReady: boolean;
  playbackMode: PlaybackMode;
  play: (track: TastifyTrack) => void;
  playArtist: (artist: TastifyArtist) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seek: (fraction: number) => void;
  setQueue: (tracks: TastifyTrack[], startIndex?: number) => void;
  stop: () => void;
}

export const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export interface PlaybackProviderProps extends PlaybackConfig {
  children: ReactNode;
  /** 'preview' uses preview URLs, 'sdk' uses Spotify Web Playback SDK (Premium required), 'auto' tries SDK first. */
  playbackMode?: PlaybackMode | 'auto';
  /** Device name shown in Spotify Connect. */
  deviceName?: string;
  /** Initial volume (0–1). */
  volume?: number;
  /** Called when SDK mode fails due to non-Premium account. */
  onPremiumRequired?: () => void;
}

const IDLE_STATE: PlaybackState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  currentTime: 0,
  playbackMode: 'preview',
};

export function PlaybackProvider({
  ui,
  toastPosition = 'bottom-right',
  playbackMode: requestedMode = 'auto',
  deviceName,
  volume,
  onPremiumRequired,
  children,
}: PlaybackProviderProps) {
  const client = useTastifyClient();
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [state, setState] = useState<PlaybackState>(IDLE_STATE);
  const [isReady, setIsReady] = useState(false);

  // Initialize player
  useEffect(() => {
    let cancelled = false;

    async function init() {
      let p: AudioPlayer;

      if (requestedMode === 'preview') {
        p = getAudioPlayer();
      } else {
        // 'sdk' or 'auto' — try SDK first
        try {
          p = await getOrCreateSDKPlayer({
            getToken: () => client.getAccessToken(),
            deviceName,
            volume,
            onPremiumRequired,
          });
        } catch {
          if (requestedMode === 'sdk') {
            // SDK was explicitly requested but failed
            onPremiumRequired?.();
          }
          p = getAudioPlayer();
        }
      }

      if (!cancelled) {
        setPlayer(p);
        setState(p.getState());
        setIsReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [client, requestedMode, deviceName, volume, onPremiumRequired]);

  // Subscribe to player events
  useEffect(() => {
    if (!player) return;

    const unsub = player.subscribe('statechange', () => {
      setState(player.getState());
    });
    const unsubTrack = player.subscribe('trackchange', () => {
      setState(player.getState());
    });
    return () => {
      unsub();
      unsubTrack();
    };
  }, [player]);

  const play = useCallback(
    (track: TastifyTrack) => {
      player?.play(track);
    },
    [player],
  );

  const playArtist = useCallback(
    async (artist: TastifyArtist) => {
      if (!player) return;
      try {
        const tracks = await client.getArtistTopTracks(artist.id);
        // In SDK mode all tracks are playable; in preview mode filter by previewUrl
        const playable =
          state.playbackMode === 'sdk'
            ? tracks
            : tracks.filter((t) => t.previewUrl);
        if (playable.length > 0) {
          player.setQueue(playable, 0);
        }
      } catch {
        // Silently ignore errors
      }
    },
    [client, player, state.playbackMode],
  );

  const pause = useCallback(() => player?.pause(), [player]);
  const resume = useCallback(() => player?.resume(), [player]);
  const togglePlayPause = useCallback(() => player?.togglePlayPause(), [player]);
  const next = useCallback(() => player?.next(), [player]);
  const previous = useCallback(() => player?.previous(), [player]);
  const seek = useCallback((f: number) => player?.seek(f), [player]);
  const setQueue = useCallback(
    (tracks: TastifyTrack[], startIndex?: number) =>
      player?.setQueue(tracks, startIndex),
    [player],
  );
  const stop = useCallback(() => player?.stop(), [player]);

  const config: PlaybackConfig = { ui, toastPosition };

  const value: PlaybackContextValue = {
    state,
    config,
    isReady,
    playbackMode: state.playbackMode,
    play,
    playArtist,
    pause,
    resume,
    togglePlayPause,
    next,
    previous,
    seek,
    setQueue,
    stop,
  };

  return (
    <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlayback must be used within a <PlaybackProvider>');
  }
  return ctx;
}
