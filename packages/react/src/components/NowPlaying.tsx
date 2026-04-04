'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { useCallback, useContext, useEffect, useRef } from 'react';
import type { NowPlayingData, TastifyTrack } from '@tastify/core';
import { syncNowPlayingSkeletonWidths } from '@tastify/core';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect.js';
import { useNowPlaying } from '../hooks/useNowPlaying.js';
import { PlaybackContext } from '../playback.js';
import { Waveform } from './Waveform.js';

export interface NowPlayingProps {
  pollInterval?: number;
  showArt?: boolean;
  /** When false, the widget is not clickable and does not start playback. Default true. */
  interactive?: boolean;
  compact?: boolean;
  contained?: boolean;
  /**
   * When true and nothing is live, show the most recent track with the same layout as a playing item.
   * When false, `null` from the API yields the empty idle state (and `fallback` if provided).
   */
  fallbackToRecent?: boolean;
  header?: string | null;
  fallback?: ReactNode;
  className?: string;
  children?: (data: NowPlayingData) => ReactNode;
  /** If set, called instead of the playback context's `play` when the widget is clicked. */
  onPlay?: (track: TastifyTrack) => void;
}

export function NowPlaying({
  pollInterval = 15_000,
  showArt = true,
  interactive = true,
  compact = false,
  contained = false,
  fallbackToRecent = false,
  header = 'Listening to',
  fallback,
  className,
  children,
  onPlay,
}: NowPlayingProps) {
  const playback = useContext(PlaybackContext);
  const state = useNowPlaying({ pollInterval, fallbackToRecent });
  const rootRef = useRef<HTMLDivElement>(null);

  const data = state.status === 'success' ? state.data : null;
  const isLoading = state.status === 'loading' || state.status === 'idle';
  const loaded = !isLoading && !!data;
  const track = data?.track;
  const isPlaying = data?.isPlaying ?? false;
  const art = track?.album.images[0]?.url;
  const artistNames = track?.artists.map((a: { name: string }) => a.name).join(', ') ?? '';

  const isFullPlayback = playback?.playbackMode === 'sdk' || playback?.playbackMode === 'embed';
  const isPlayable =
    loaded &&
    interactive &&
    !!(onPlay || (playback && (isFullPlayback || track!.previewUrl)));

  const tastifyCurrentId = playback?.state.currentTrack?.id ?? null;
  const showWaveform = loaded && tastifyCurrentId === track?.id;
  const waveformPaused = showWaveform && !playback?.state.isPlaying;
  const showPlayingChrome = showWaveform;

  const handlePlay = useCallback(() => {
    if (!track) return;
    if (onPlay) {
      onPlay(track);
    } else if (playback) {
      playback.play(track);
    }
  }, [track, onPlay, playback]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePlay();
      }
    },
    [handlePlay],
  );

  const interactiveProps =
    isPlayable
      ? {
          role: 'button' as const,
          tabIndex: 0 as const,
          onClick: handlePlay,
          onKeyDown: handleKeyDown,
          'aria-label': `Play ${track!.name} by ${artistNames}`,
        }
      : {};

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!loaded) {
      root.querySelectorAll<HTMLElement>('.tf-now-playing__sk-line').forEach((el) => {
        el.style.width = '';
      });
      return;
    }
    syncNowPlayingSkeletonWidths(root);
  }, [
    loaded,
    track?.name,
    artistNames,
    compact,
    showArt,
    Boolean(art),
    showWaveform,
  ]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const root = rootRef.current;
    if (!loaded || !root) return;
    const content = root.querySelector<HTMLElement>('.tf-now-playing__content');
    if (!content) return;
    const ro = new ResizeObserver(() => syncNowPlayingSkeletonWidths(root));
    ro.observe(content);
    return () => ro.disconnect();
  }, [loaded, track?.name, artistNames, compact, showArt, Boolean(art), showWaveform]);

  if (state.status === 'error') {
    return null;
  }

  // Idle (no data after load) — render without crossfade layers
  if (!isLoading && !data) {
    const idleCls = [
      'tf-now-playing',
      'tf-now-playing--idle',
      compact && 'tf-now-playing--compact',
      contained && 'tf-now-playing--contained',
    ]
      .filter(Boolean)
      .join(' ');

    if (fallback) {
      return <div className={cls(idleCls, className)}>{fallback}</div>;
    }
    return <div className={cls(idleCls, className)} />;
  }

  // Custom render prop — no skeleton crossfade
  if (loaded && children) {
    return <>{children(data!)}</>;
  }

  const rootCls = [
    'tf-now-playing',
    loaded && 'tf-now-playing--loaded',
    compact && 'tf-now-playing--compact',
    contained && 'tf-now-playing--contained',
    loaded && !isPlaying && 'tf-now-playing--idle',
    loaded && isPlayable && 'tf-now-playing--playable',
    loaded && showPlayingChrome && 'tf-now-playing--playing',
  ]
    .filter(Boolean)
    .join(' ');

  const skeleton = (
    <div className="tf-now-playing__skeleton" aria-hidden={loaded || undefined}>
      {showArt && <div className="tf-skeleton tf-skeleton--art" />}
      <div className="tf-now-playing__info">
        {compact ? (
          <div
            className="tf-skeleton tf-skeleton--text tf-now-playing__sk-line"
            data-tf-sk="row"
          />
        ) : (
          <>
            <div
              className="tf-skeleton tf-skeleton--text tf-now-playing__sk-line"
              data-tf-sk="track"
            />
            <div
              className="tf-skeleton tf-skeleton--text-sm tf-now-playing__sk-line"
              data-tf-sk="artist"
            />
          </>
        )}
      </div>
    </div>
  );

  const contentChildren = loaded && (
    <>
      {showArt && art && (
        <img
          className="tf-now-playing__art"
          src={art}
          alt={track!.album.name}
          loading="lazy"
        />
      )}
      <div className="tf-now-playing__info">
        <span className="tf-now-playing__track">{track!.name}</span>
        <span className="tf-now-playing__artist">{artistNames}</span>
      </div>
      {showWaveform && <Waveform paused={waveformPaused} />}
    </>
  );

  const content = (
    <div className="tf-now-playing__content" {...interactiveProps}>
      {contentChildren}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cls(rootCls, className)}
      aria-busy={isLoading || undefined}
      aria-live="polite"
    >
      {!compact && header !== null && (
        <h3 className="tf-now-playing__header">{header}</h3>
      )}
      <div className="tf-now-playing__body">
        {skeleton}
        {content}
      </div>
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
