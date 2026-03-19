import type { ReactNode } from 'react';
import type { NowPlayingData } from '@tastify/core';
import { useNowPlaying } from '../hooks/useNowPlaying.js';

export interface NowPlayingProps {
  pollInterval?: number;
  showArt?: boolean;
  showProgress?: boolean;
  showLink?: boolean;
  compact?: boolean;
  fallback?: ReactNode;
  className?: string;
  children?: (data: NowPlayingData) => ReactNode;
}

export function NowPlaying({
  pollInterval = 15_000,
  showArt = true,
  showProgress = true,
  showLink = true,
  compact = false,
  fallback,
  className,
  children,
}: NowPlayingProps) {
  const state = useNowPlaying({ pollInterval });

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className={cls('tf-now-playing tf-now-playing--loading', className)} />;
  }

  if (state.status === 'error') {
    return null;
  }

  const { data } = state;

  if (!data) {
    if (fallback) {
      return (
        <div className={cls('tf-now-playing tf-now-playing--idle', className)}>
          {fallback}
        </div>
      );
    }
    return <div className={cls('tf-now-playing tf-now-playing--idle', className)} />;
  }

  if (children) {
    return <>{children(data)}</>;
  }

  const { track, isPlaying, progressMs } = data;
  const art = track.album.images[0]?.url;
  const progressPct = track.durationMs > 0 ? (progressMs / track.durationMs) * 100 : 0;
  const artistNames = track.artists.map((a: { name: string }) => a.name).join(', ');

  const rootCls = [
    'tf-now-playing',
    compact && 'tf-now-playing--compact',
    !isPlaying && 'tf-now-playing--idle',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls(rootCls, className)}>
      {showArt && art && (
        <img
          className="tf-now-playing__art"
          src={art}
          alt={track.album.name}
          loading="lazy"
        />
      )}
      <div className="tf-now-playing__info">
        <span className="tf-now-playing__track">{track.name}</span>
        <span className="tf-now-playing__artist">{artistNames}</span>
      </div>
      {showProgress && !compact && (
        <div className="tf-now-playing__progress">
          <div
            className="tf-now-playing__progress-bar"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
      {isPlaying && <span className="tf-now-playing__pulse" />}
      {showLink && (
        <a
          className="tf-now-playing__link"
          href={track.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Spotify
        </a>
      )}
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
