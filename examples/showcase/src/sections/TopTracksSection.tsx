import { useState } from 'react';
import { TopTracks } from '@tastify/react';
import { SectionLayout, Toggle, Select, NumberInput } from './Controls';

export function TopTracksSection() {
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [showRank, setShowRank] = useState(true);
  const [showArt, setShowArt] = useState(true);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(true);
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');
  const [limit, setLimit] = useState(5);
  const [columns, setColumns] = useState(3);

  const code = `<TopTracks
  layout="${layout}"
  timeRange="${timeRange}"
  limit={${limit}}
  showRank={${showRank}}
  showArt={${showArt}}
  showTimeRangeSelector={${showTimeRangeSelector}}${layout === 'grid' ? `\n  columns={${columns}}` : ''}
/>`;

  return (
    <SectionLayout
      title="TopTracks"
      description="Shows the user's most-played tracks over a selected time range, in list or grid layout."
      code={code}
      controls={
        <>
          <Select
            label="layout"
            value={layout}
            options={[
              { value: 'list', label: 'list' },
              { value: 'grid', label: 'grid' },
            ]}
            onChange={setLayout}
          />
          <Select
            label="timeRange"
            value={timeRange}
            options={[
              { value: 'short_term', label: 'short_term (4 weeks)' },
              { value: 'medium_term', label: 'medium_term (6 months)' },
              { value: 'long_term', label: 'long_term (all time)' },
            ]}
            onChange={setTimeRange}
          />
          <NumberInput label="limit" value={limit} min={1} max={50} onChange={setLimit} />
          <Toggle label="showRank" value={showRank} onChange={setShowRank} />
          <Toggle label="showArt" value={showArt} onChange={setShowArt} />
          <Toggle label="showTimeRangeSelector" value={showTimeRangeSelector} onChange={setShowTimeRangeSelector} />
          {layout === 'grid' && (
            <NumberInput label="columns" value={columns} min={1} max={6} onChange={setColumns} />
          )}
        </>
      }
    >
      <TopTracks
        layout={layout}
        timeRange={timeRange}
        limit={limit}
        showRank={showRank}
        showArt={showArt}
        showTimeRangeSelector={showTimeRangeSelector}
        columns={columns}
      />
    </SectionLayout>
  );
}
