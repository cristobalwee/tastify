import { useState, type ReactNode } from 'react';
import type { TopTracksData, TimeRange } from '@tastify/core';
import { useTopTracks } from '../hooks/useTopTracks.js';
import { TrackCard } from './TrackCard.js';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: '4 weeks',
  medium_term: '6 months',
  long_term: 'All time',
};

export interface TopTracksProps {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid';
  showRank?: boolean;
  showArt?: boolean;
  columns?: number;
  header?: string | null;
  showTimeRangeSelector?: boolean;
  className?: string;
  children?: (data: TopTracksData) => ReactNode;
}

export function TopTracks({
  timeRange: timeRangeProp,
  limit = 5,
  layout = 'list',
  showRank = true,
  showArt = true,
  columns = 3,
  header = 'On Repeat',
  showTimeRangeSelector = false,
  className,
  children,
}: TopTracksProps) {
  const [internalRange, setInternalRange] = useState<TimeRange>(
    timeRangeProp ?? 'medium_term',
  );
  const timeRange = timeRangeProp ?? internalRange;
  const state = useTopTracks({ timeRange, limit });

  if (state.status === 'loading' || state.status === 'idle') {
    return <div className={cls('tf-top-tracks tf-top-tracks--loading', className)} />;
  }

  if (state.status === 'error') {
    return null;
  }

  const { data } = state;

  if (children) {
    return <>{children(data)}</>;
  }

  return (
    <div className={cls(`tf-top-tracks tf-top-tracks--${layout}`, className)}>
      {header !== null && <h3 className="tf-top-tracks__header">{header}</h3>}
      {showTimeRangeSelector && (
        <div className="tf-top-tracks__selector">
          {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
            <button
              key={range}
              className={`tf-top-tracks__selector-btn${timeRange === range ? ' tf-top-tracks__selector-btn--active' : ''}`}
              onClick={() => setInternalRange(range)}
            >
              {TIME_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      )}
      <div
        className="tf-top-tracks__list"
        style={
          layout === 'grid'
            ? { gridTemplateColumns: `repeat(${columns}, 1fr)` }
            : undefined
        }
      >
        {data.tracks.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            rank={layout === 'list' && showRank ? i + 1 : undefined}
            showArt={showArt}
            layout={layout}
          />
        ))}
      </div>
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
