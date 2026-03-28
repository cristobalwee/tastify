import { useContext } from 'react';
import type { TastifyArtist } from '@tastify/core';
import { PlaybackContext } from '../playback.js';

interface ArtistCardProps {
  artist: TastifyArtist;
  layout: 'grid' | 'list';
  showGenres?: boolean;
  onPlay?: (artist: TastifyArtist) => void;
}

export function ArtistCardSkeleton({ layout }: { layout: 'grid' | 'list' }) {
  if (layout === 'grid') {
    return (
      <div className="tf-artist-card tf-artist-card--grid">
        <div className="tf-skeleton tf-skeleton--photo-circle" />
        <div className="tf-skeleton tf-skeleton--text" style={{ width: '70%' }} />
      </div>
    );
  }
  return (
    <div className="tf-artist-card tf-artist-card--list">
      <div className="tf-skeleton tf-skeleton--art tf-skeleton--circle" />
      <div className="tf-artist-card__info">
        <div className="tf-skeleton tf-skeleton--text" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

export function ArtistCard({ artist, layout, showGenres = false, onPlay }: ArtistCardProps) {
  const playback = useContext(PlaybackContext);
  const photo = artist.images[0]?.url;

  const isPlayable = !!(onPlay || playback);
  const isPlaying = playback?.state.currentTrack?.artists.some((a) => a.id === artist.id) ?? false;

  function handleClick() {
    if (onPlay) {
      onPlay(artist);
    } else if (playback) {
      playback.playArtist(artist);
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
    if (isPlayable) parts.push('tf-artist-card--playable');
    if (isPlaying) parts.push('tf-artist-card--playing');
    return parts.join(' ');
  }

  if (layout === 'grid') {
    return (
      <div className={cardCls('tf-artist-card tf-artist-card--grid')} {...interactiveProps}>
        {photo && (
          <img
            className="tf-artist-card__photo"
            src={photo}
            alt={artist.name}
            loading="lazy"
          />
        )}
        <span className="tf-artist-card__name">{artist.name}</span>
        {showGenres && artist.genres.length > 0 && (
          <div className="tf-artist-card__genres">
            {artist.genres.slice(0, 3).map((g) => (
              <span key={g} className="tf-artist-card__genre">{g}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cardCls('tf-artist-card tf-artist-card--list')} {...interactiveProps}>
      {photo && (
        <img
          className="tf-artist-card__photo"
          src={photo}
          alt={artist.name}
          loading="lazy"
        />
      )}
      <div className="tf-artist-card__info">
        <span className="tf-artist-card__name">{artist.name}</span>
        {showGenres && artist.genres.length > 0 && (
          <div className="tf-artist-card__genres">
            {artist.genres.slice(0, 3).map((g) => (
              <span key={g} className="tf-artist-card__genre">{g}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
