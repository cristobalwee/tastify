'use client';

import type { ReactNode } from 'react';
import type { RecentlyPlayedData } from '@tastify/core';
import { useRecentlyPlayed } from '../hooks/useRecentlyPlayed.js';
import { TrackCard } from './TrackCard.js';

export interface RecentlyPlayedProps {
  limit?: number;
  layout?: 'timeline' | 'list';
  showTimestamp?: boolean;
  groupByDay?: boolean;
  header?: string | null;
  className?: string;
  children?: (data: RecentlyPlayedData) => ReactNode;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function RecentlyPlayed({
  limit = 10,
  layout = 'list',
  showTimestamp = true,
  groupByDay = false,
  header = 'Recently Played',
  className,
  children,
}: RecentlyPlayedProps) {
  const state = useRecentlyPlayed({ limit });

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className={cls('tf-recently-played tf-recently-played--loading', className)} />
    );
  }

  if (state.status === 'error') {
    return null;
  }

  const { data } = state;

  if (children) {
    return <>{children(data)}</>;
  }

  const items = data.tracks;

  // Group by day if requested
  let grouped: Map<string, typeof items> | null = null;
  if (groupByDay) {
    grouped = new Map();
    for (const item of items) {
      const key = getDayKey(item.playedAt);
      const existing = grouped.get(key);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }
  }

  return (
    <div
      className={cls(
        `tf-recently-played tf-recently-played--${layout}`,
        className,
      )}
    >
      {header !== null && (
        <h3 className="tf-recently-played__header">{header}</h3>
      )}
      {grouped
        ? Array.from(grouped.entries()).map(([day, dayItems]) => (
            <div key={day} className="tf-recently-played__group">
              <h4 className="tf-recently-played__day">{day}</h4>
              <div className="tf-recently-played__list">
                {dayItems.map((item, i) => (
                  <div key={`${item.track.id}-${i}`} className="tf-recently-played__item">
                    <TrackCard track={item.track} showArt layout="list" />
                    {showTimestamp && (
                      <span className="tf-recently-played__time">
                        {formatRelativeTime(item.playedAt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        : (
            <div className="tf-recently-played__list">
              {items.map((item, i) => (
                <div key={`${item.track.id}-${i}`} className="tf-recently-played__item">
                  <TrackCard track={item.track} showArt layout="list" />
                  {showTimestamp && (
                    <span className="tf-recently-played__time">
                      {layout === 'timeline'
                        ? formatRelativeTime(item.playedAt)
                        : formatRelativeTime(item.playedAt)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

function cls(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}
