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

export function TrackCard({ track, rank, showArt = true, layout, onPlay }: TrackCardProps) {
  const playback = useContext(PlaybackContext);
  const art = track.album.images[0]?.url;

  const isFullPlayback = playback?.playbackMode === 'sdk' || playback?.playbackMode === 'embed';
  const isPlayable = !!(onPlay || (playback && (isFullPlayback || track.previewUrl)));
  const isPlaying = playback?.state.currentTrack?.id === track.id;

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
      </div>
    );
  }

  return (
    <div className={cardCls('tf-track-card tf-track-card--list')} {...interactiveProps}>
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
    </div>
  );
}
