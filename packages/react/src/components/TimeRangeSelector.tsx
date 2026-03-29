'use client';

import type { TimeRange } from '@tastify/core';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: '4 weeks',
  medium_term: '6 months',
  long_term: '1 year',
};

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  isLoading?: boolean;
  className?: string;
}

export function TimeRangeSelector({
  value,
  onChange,
  isLoading = false,
  className,
}: TimeRangeSelectorProps) {
  const base = 'tf-time-range-selector';
  const cls = className ? `${base} ${className}` : base;

  return (
    <div className={cls}>
      {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
        <button
          key={range}
          className={`tf-time-range-selector__btn${value === range ? ' tf-time-range-selector__btn--active' : ''}`}
          onClick={() => onChange(range)}
        >
          {TIME_RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}
