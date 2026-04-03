'use client';

import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { syncNowPlayingSkeletonWidths, type NowPlayingData } from '@tastify/core';
import { useNowPlaying } from '../hooks/useNowPlaying.js';

export interface NowPlayingProps {
  pollInterval?: number;
  showArt?: boolean;
  showLink?: boolean;
  compact?: boolean;
  contained?: boolean;
  /** When false, the default (non-compact) layout omits the section title `<h3>`. */
  showTitle?: boolean;
  /**
   * When true and nothing is live, show the most recent track with the same layout as a playing item.
   * When false, `null` from the API yields the empty idle state (and `fallback` if provided).
   */
  fallbackToRecent?: boolean;
  header?: string | null;
  fallback?: ReactNode;
  className?: string;
  children?: (data: NowPlayingData) => ReactNode;
}

export function NowPlaying({
  pollInterval = 15_000,
  showArt = true,
  showLink = true,
  compact = false,
  contained = false,
  showTitle = true,
  fallbackToRecent = false,
  header = 'Listening to',
  fallback,
  className,
  children,
}: NowPlayingProps) {
  const state = useNowPlaying({ pollInterval, fallbackToRecent });
  const rootRef = useRef<HTMLDivElement>(null);

  const data = state.status === 'success' ? state.data : null;
  const isLoading = state.status === 'loading' || state.status === 'idle';
  const loaded = !isLoading && !!data;
  const track = data?.track;
  const isPlaying = data?.isPlaying ?? false;
  const art = track?.album.images[0]?.url;
  const artistNames = track?.artists.map((a: { name: string }) => a.name).join(', ') ?? '';

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!loaded) {
      root.querySelectorAll<HTMLElement>('.tf-now-playing__sk-line').forEach((el) => {
        el.style.width = '';
      });
      return;
    }
    syncNowPlayingSkeletonWidths(root);
  }, [loaded, track?.name, artistNames, compact, showArt, Boolean(art), showLink]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const root = rootRef.current;
    if (!loaded || !root) return;
    const content = root.querySelector<HTMLElement>('.tf-now-playing__content');
    if (!content) return;
    const ro = new ResizeObserver(() => syncNowPlayingSkeletonWidths(root));
    ro.observe(content);
    return () => ro.disconnect();
  }, [loaded, track?.name, artistNames, compact, showArt, Boolean(art), showLink]);

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
    loaded && compact && showLink && 'tf-now-playing--linked',
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
      {!compact && showLink && (
        <div className="tf-now-playing__link-placeholder">
          <div
            className="tf-skeleton tf-skeleton--text-sm tf-now-playing__sk-line"
            data-tf-sk="link"
          />
        </div>
      )}
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
      {!compact && showLink && (
        <a
          className="tf-now-playing__link"
          href={track!.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Spotify
        </a>
      )}
    </>
  );

  const content =
    compact && showLink && loaded ? (
      <a
        className="tf-now-playing__content"
        href={track!.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${track!.name} by ${artistNames} in Spotify`}
      >
        {contentChildren}
      </a>
    ) : (
      <div className="tf-now-playing__content">{contentChildren}</div>
    );

  return (
    <div
      ref={rootRef}
      className={cls(rootCls, className)}
      aria-busy={isLoading || undefined}
      aria-live="polite"
    >
      {!compact && showTitle && header !== null && (
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
