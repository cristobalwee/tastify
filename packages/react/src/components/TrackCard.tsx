import type { TastifyTrack } from '@tastify/core';

interface TrackCardProps {
  track: TastifyTrack;
  rank?: number;
  showArt?: boolean;
  layout: 'list' | 'grid';
}

export function TrackCard({ track, rank, showArt = true, layout }: TrackCardProps) {
  const art = track.album.images[0]?.url;

  if (layout === 'grid') {
    return (
      <div className="tf-track-card tf-track-card--grid">
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
    <div className="tf-track-card tf-track-card--list">
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
