import { useContext } from 'react';
import type { TastifyTrack } from '@tastify/core';
import { PlaybackContext } from '../playback.js';

interface TrackCardProps {
  track?: TastifyTrack;
  rank?: number;
  showArt?: boolean;
  showRank?: boolean;
  layout: 'list' | 'grid' | 'compact-grid';
  interactive?: boolean;
  onPlay?: (track: TastifyTrack) => void;
  timestamp?: string;
  showTimestamp?: boolean;
}

function Waveform({ paused }: { paused?: boolean }) {
  return (
    <span className={`tf-waveform${paused ? ' tf-waveform--paused' : ''}`}>
      <span className="tf-waveform__bar" />
      <span className="tf-waveform__bar" />
      <span className="tf-waveform__bar" />
      <span className="tf-waveform__bar" />
    </span>
  );
}

export function TrackCardSkeleton({ layout, showRank }: { layout: 'list' | 'grid' | 'compact-grid'; showRank?: boolean }) {
  return <TrackCard layout={layout} showRank={showRank} />;
}

export function TrackCard({ track, rank, showArt = true, showRank, layout, interactive = true, onPlay, timestamp, showTimestamp }: TrackCardProps) {
  const playback = useContext(PlaybackContext);
  const loaded = !!track;

  const isFullPlayback = playback?.playbackMode === 'sdk' || playback?.playbackMode === 'embed';
  const isPlayable = loaded && interactive && !!(onPlay || (playback && (isFullPlayback || track.previewUrl)));
  const isPlaying = loaded && playback?.state.currentTrack?.id === track.id;
  const isPaused = isPlaying && !playback?.state.isPlaying;

  function handleClick() {
    if (!track) return;
    if (onPlay) {
      onPlay(track);
    } else if (playback) {
      playback.play(track);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  const interactiveProps = isPlayable
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
      }
    : {};

  const classes = [
    'tf-track-card',
    `tf-track-card--${layout}`,
    loaded && 'tf-track-card--loaded',
    isPlayable && 'tf-track-card--playable',
    isPlaying && 'tf-track-card--playing',
  ].filter(Boolean).join(' ');

  const art = track?.album.images[0]?.url;

  if (layout === 'grid') {
    return (
      <div className={classes} {...interactiveProps}>
        <div className="tf-card__skeleton" aria-hidden={loaded || undefined}>
          <div className="tf-skeleton tf-skeleton--art-grid" />
          <div className="tf-skeleton tf-skeleton--text" style={{ width: '80%' }} />
          <div className="tf-skeleton tf-skeleton--text-sm" />
        </div>
        <div className="tf-card__content">
          {track && (
            <>
              {showArt && art && (
                <img
                  className="tf-track-card__art"
                  src={art}
                  alt={track.album.name}
                  loading="lazy"
                />
              )}
              <span className="tf-track-card__name">{track.name}</span>
              <span className="tf-track-card__artist">
                {track.artists.map((a) => a.name).join(', ')}
              </span>
              {isPlaying && <Waveform paused={isPaused} />}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={classes} {...interactiveProps}>
      <div className="tf-card__skeleton" aria-hidden={loaded || undefined}>
        {showRank && <div className="tf-skeleton tf-skeleton--rank" />}
        <div className="tf-skeleton tf-skeleton--art" />
        <div className="tf-track-card__info">
          <div className="tf-skeleton tf-skeleton--text" style={{ width: '70%' }} />
          <div className="tf-skeleton tf-skeleton--text-sm" />
        </div>
        {showTimestamp && <div className="tf-skeleton tf-skeleton--text-sm" style={{ width: '3em', flexShrink: 0 }} />}
      </div>
      <div className="tf-card__content">
        {track && (
          <>
            {rank != null && <span className="tf-track-card__rank">{rank}</span>}
            {showArt && art && (
              <img
                className="tf-track-card__art"
                src={art}
                alt={track.album.name}
                loading="lazy"
              />
            )}
            <div className="tf-track-card__info">
              <span className="tf-track-card__name">{track.name}</span>
              <span className="tf-track-card__artist">
                {track.artists.map((a) => a.name).join(', ')}
              </span>
            </div>
            {isPlaying && <Waveform paused={isPaused} />}
            {timestamp && <span className="tf-recently-played__time">{timestamp}</span>}
          </>
        )}
      </div>
    </div>
  );
}
