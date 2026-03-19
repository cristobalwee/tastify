import type { TastifyArtist } from '@tastify/core';

interface ArtistCardProps {
  artist: TastifyArtist;
  layout: 'grid' | 'list';
  showGenres?: boolean;
}

export function ArtistCard({ artist, layout, showGenres = false }: ArtistCardProps) {
  const photo = artist.images[0]?.url;

  if (layout === 'grid') {
    return (
      <div className="tf-artist-card tf-artist-card--grid">
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
    <div className="tf-artist-card tf-artist-card--list">
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
