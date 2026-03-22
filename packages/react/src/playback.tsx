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
  type AudioPlayer,
  type PlaybackState,
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
}

export function PlaybackProvider({
  ui,
  toastPosition = 'bottom-right',
  children,
}: PlaybackProviderProps) {
  const client = useTastifyClient();
  const [player] = useState<AudioPlayer>(() => getAudioPlayer());
  const [state, setState] = useState<PlaybackState>(() => player.getState());

  useEffect(() => {
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
      player.play(track);
    },
    [player],
  );

  const playArtist = useCallback(
    async (artist: TastifyArtist) => {
      try {
        const tracks = await client.getArtistTopTracks(artist.id);
        const playable = tracks.filter((t) => t.previewUrl);
        if (playable.length > 0) {
          player.setQueue(playable, 0);
        }
      } catch {
        // Silently ignore errors
      }
    },
    [client, player],
  );

  const pause = useCallback(() => player.pause(), [player]);
  const resume = useCallback(() => player.resume(), [player]);
  const togglePlayPause = useCallback(() => player.togglePlayPause(), [player]);
  const next = useCallback(() => player.next(), [player]);
  const previous = useCallback(() => player.previous(), [player]);
  const seek = useCallback((f: number) => player.seek(f), [player]);
  const setQueue = useCallback(
    (tracks: TastifyTrack[], startIndex?: number) =>
      player.setQueue(tracks, startIndex),
    [player],
  );
  const stop = useCallback(() => player.stop(), [player]);

  const config: PlaybackConfig = { ui, toastPosition };

  const value: PlaybackContextValue = {
    state,
    config,
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
