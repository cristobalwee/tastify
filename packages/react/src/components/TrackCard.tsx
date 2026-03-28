import { useContext } from 'react';
import type { TastifyTrack } from '@tastify/core';
import { PlaybackContext } from '../playback.js';

interface TrackCardProps {
  track: TastifyTrack;
  rank?: number;
  showArt?: boolean;
  layout: 'list' | 'grid';
  onPlay?: (track: TastifyTrack) => void;
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

export function TrackCardSkeleton({ layout }: { layout: 'list' | 'grid' }) {
  if (layout === 'grid') {
    return (
      <div className="tf-track-card tf-track-card--grid">
        <div className="tf-skeleton tf-skeleton--art-grid" />
        <div className="tf-skeleton tf-skeleton--text" style={{ width: '80%' }} />
        <div className="tf-skeleton tf-skeleton--text-sm" />
      </div>
    );
  }
  return (
    <div className="tf-track-card tf-track-card--list">
      <div className="tf-skeleton tf-skeleton--art" />
      <div className="tf-track-card__info">
        <div className="tf-skeleton tf-skeleton--text" style={{ width: '70%' }} />
        <div className="tf-skeleton tf-skeleton--text-sm" />
      </div>
    </div>
  );
}

export function TrackCard({ track, rank, showArt = true, layout, onPlay }: TrackCardProps) {
  const playback = useContext(PlaybackContext);
  const art = track.album.images[0]?.url;

  const isFullPlayback = playback?.playbackMode === 'sdk' || playback?.playbackMode === 'embed';
  const isPlayable = !!(onPlay || (playback && (isFullPlayback || track.previewUrl)));
  const isPlaying = playback?.state.currentTrack?.id === track.id;
  const isPaused = isPlaying && !playback?.state.isPlaying;

  function handleClick() {
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

  function cardCls(base: string): string {
    const parts = [base];
    if (isPlayable) parts.push('tf-track-card--playable');
    if (isPlaying) parts.push('tf-track-card--playing');
    return parts.join(' ');
  }

  if (layout === 'grid') {
    return (
      <div className={cardCls('tf-track-card tf-track-card--grid')} {...interactiveProps}>
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
      </div>
    );
  }

  return (
    <div className={cardCls('tf-track-card tf-track-card--list')} {...interactiveProps}>
      {rank != null && !isPlaying && <span className="tf-track-card__rank">{rank}</span>}
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
    </div>
  );
}
