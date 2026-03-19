import { useState, type ReactNode } from 'react';
import type { TopArtistsData, TimeRange } from '@tastify/core';
import { useTopArtists } from '../hooks/useTopArtists.js';
import { ArtistCard } from './ArtistCard.js';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: '4 weeks',
  medium_term: '6 months',
  long_term: 'All time',
};

export interface TopArtistsProps {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'grid' | 'list';
  columns?: number;
  showGenres?: boolean;
  header?: string | null;
  showTimeRangeSelector?: boolean;
  className?: string;
  children?: (data: TopArtistsData) => ReactNode;
}

export function TopArtists({
  timeRange: timeRangeProp,
  limit = 6,
  layout = 'grid',
  columns = 3,
  showGenres = false,
  header = 'Top Artists',
  showTimeRangeSelector = false,
  className,
  children,
}: TopArtistsProps) {
  const [internalRange, setInternalRange] = useState<TimeRange>(
    timeRangeProp ?? 'medium_term',
  );
  const timeRange = timeRangeProp ?? internalRange;
  const state = useTopArtists({ timeRange, limit });

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className={cls('tf-top-artists tf-top-artists--loading', className)} />;
  }

  if (state.status === 'error') {
    return null;
  }

  const { data } = state;

  if (children) {
    return <>{children(data)}</>;
  }

  return (
    <div className={cls(`tf-top-artists tf-top-artists--${layout}`, className)}>
      {header !== null && <h3 className="tf-top-artists__header">{header}</h3>}
      {showTimeRangeSelector && (
        <div className="tf-top-artists__selector">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
            <button
              key={range}
              className={`tf-top-artists__selector-btn${timeRange === range ? ' tf-top-artists__selector-btn--active' : ''}`}
              onClick={() => setInternalRange(range)}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      )}
      <div
        className="tf-top-artists__list"
        style={
          layout === 'grid'
            ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
            : undefined
        }
      >
        {data.artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            layout={layout}
            showGenres={showGenres}
          />
        ))}
      </div>
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
