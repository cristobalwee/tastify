'use client';

import { useState, type ReactNode } from 'react';
import type { TopArtistsData, TimeRange } from '@tastify/core';
import { useTopArtists } from '../hooks/useTopArtists.js';
import { ArtistCard } from './ArtistCard.js';
import { TimeRangeSelector } from './TimeRangeSelector.js';

export interface TopArtistsProps {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'grid' | 'list' | 'compact-grid';
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

  const isLoading = state.status === 'loading' || state.status === 'idle';

  if (state.status === 'error') {
    return null;
  }

  const artists = state.status === 'success' ? state.data.artists : [];

  if (!isLoading && children && state.status === 'success') {
    return <>{children(state.data)}</>;
  }

  const cardCount = isLoading ? limit : artists.length;

  return (
    <div className={cls(`tf-top-artists tf-top-artists--${layout}`, className)}>
      {header !== null && <h3 className="tf-top-artists__header">{header}</h3>}
      {showTimeRangeSelector && (
        <TimeRangeSelector
          value={timeRange}
          onChange={setInternalRange}
          isLoading={isLoading}
        />
      )}
      <div
        className="tf-top-artists__list"
        style={
          layout !== 'list'
            ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
            : undefined
        }
      >
        {Array.from({ length: cardCount }, (_, i) => (
          <ArtistCard
            key={i}
            artist={artists[i]}
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
