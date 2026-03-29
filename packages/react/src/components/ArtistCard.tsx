import { useContext } from 'react';
import type { TastifyArtist } from '@tastify/core';
import { PlaybackContext } from '../playback.js';

interface ArtistCardProps {
  artist?: TastifyArtist;
  layout: 'grid' | 'list' | 'compact-grid';
  showGenres?: boolean;
  onPlay?: (artist: TastifyArtist) => void;
}

export function ArtistCardSkeleton({ layout }: { layout: 'grid' | 'list' | 'compact-grid' }) {
  return <ArtistCard layout={layout} />;
}

export function ArtistCard({ artist, layout, showGenres = false, onPlay }: ArtistCardProps) {
  const playback = useContext(PlaybackContext);
  const loaded = !!artist;

  const isPlayable = loaded && !!(onPlay || playback);
  const isPlaying = loaded && (playback?.state.currentTrack?.artists.some((a) => a.id === artist.id) ?? false);

  function handleClick() {
    if (!artist) return;
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

  const classes = [
    'tf-artist-card',
    `tf-artist-card--${layout}`,
    loaded && 'tf-artist-card--loaded',
    isPlayable && 'tf-artist-card--playable',
    isPlaying && 'tf-artist-card--playing',
  ].filter(Boolean).join(' ');

  const photo = artist?.images[0]?.url;

  if (layout === 'grid') {
    return (
      <div className={classes} {...interactiveProps}>
        <div className="tf-card__skeleton" aria-hidden={loaded || undefined}>
          <div className="tf-skeleton tf-skeleton--photo-circle" />
          <div className="tf-skeleton tf-skeleton--text" style={{ width: '70%' }} />
        </div>
        <div className="tf-card__content">
          {artist && (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={classes} {...interactiveProps}>
      <div className="tf-card__skeleton" aria-hidden={loaded || undefined}>
        <div className="tf-skeleton tf-skeleton--art tf-skeleton--circle" />
        <div className="tf-artist-card__info">
          <div className="tf-skeleton tf-skeleton--text" style={{ width: '60%' }} />
        </div>
      </div>
      <div className="tf-card__content">
        {artist && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
