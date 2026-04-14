import type { TastifyTopAlbum } from '@tastify/core';

interface AlbumCardProps {
  album?: TastifyTopAlbum;
  rank?: number;
  showArt?: boolean;
  showRank?: boolean;
  layout: 'list' | 'grid' | 'compact-grid';
}

export function AlbumCardSkeleton({
  layout,
  showRank,
}: {
  layout: 'list' | 'grid' | 'compact-grid';
  showRank?: boolean;
}) {
  return <AlbumCard layout={layout} showRank={showRank} />;
}

export function AlbumCard({
  album,
  rank,
  showArt = true,
  showRank,
  layout,
}: AlbumCardProps) {
  const loaded = !!album;
  const classes = [
    'tf-track-card',
    `tf-track-card--${layout}`,
    loaded && 'tf-track-card--loaded',
  ]
    .filter(Boolean)
    .join(' ');

  const art = album?.images[0]?.url;
  const artistNames = album?.artists.map((artist) => artist.name).join(', ');

  if (layout === 'grid') {
    return (
      <div className={classes}>
        <div className="tf-card__skeleton" aria-hidden={loaded || undefined}>
          <div className="tf-skeleton tf-skeleton--art-grid" />
          <div className="tf-skeleton tf-skeleton--text" style={{ width: '80%' }} />
          <div className="tf-skeleton tf-skeleton--text-sm" />
        </div>
        <div className="tf-card__content">
          {album && (
            <>
              {showArt && art && (
                <img
                  className="tf-track-card__art"
                  src={art}
                  alt={album.name}
                  loading="lazy"
                />
              )}
              <span className="tf-track-card__name">{album.name}</span>
              {artistNames && (
                <span className="tf-track-card__artist">{artistNames}</span>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      <div className="tf-card__skeleton" aria-hidden={loaded || undefined}>
        {showRank && <div className="tf-skeleton tf-skeleton--rank" />}
        <div className="tf-skeleton tf-skeleton--art" />
        <div className="tf-track-card__info">
          <div className="tf-skeleton tf-skeleton--text" style={{ width: '70%' }} />
          <div className="tf-skeleton tf-skeleton--text-sm" />
        </div>
      </div>
      <div className="tf-card__content">
        {album && (
          <>
            {rank != null && <span className="tf-track-card__rank">{rank}</span>}
            {showArt && art && (
              <img
                className="tf-track-card__art"
                src={art}
                alt={album.name}
                loading="lazy"
              />
            )}
            <div className="tf-track-card__info">
              <span className="tf-track-card__name">{album.name}</span>
              {artistNames && (
                <span className="tf-track-card__artist">{artistNames}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
