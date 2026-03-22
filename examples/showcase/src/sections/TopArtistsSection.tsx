import { useState } from 'react';
import { TopArtists } from '@tastify/react';
import { SectionLayout, Toggle, Select, NumberInput } from './Controls';

export function TopArtistsSection() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showGenres, setShowGenres] = useState(false);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(true);
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');
  const [limit, setLimit] = useState(6);
  const [columns, setColumns] = useState(3);

  const code = `<TopArtists
  layout="${layout}"
  timeRange="${timeRange}"
  limit={${limit}}
  showGenres={${showGenres}}
  showTimeRangeSelector={${showTimeRangeSelector}}${layout === 'grid' ? `\n  columns={${columns}}` : ''}
/>`;

  return (
    <SectionLayout
      title="TopArtists"
      description="Displays the user's top artists with optional genre tags, in grid or list layout."
      code={code}
      controls={
        <>
          <Select
            label="layout"
            value={layout}
            options={[
              { value: 'grid', label: 'grid' },
              { value: 'list', label: 'list' },
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
          <Toggle label="showGenres" value={showGenres} onChange={setShowGenres} />
          <Toggle label="showTimeRangeSelector" value={showTimeRangeSelector} onChange={setShowTimeRangeSelector} />
          {layout === 'grid' && (
            <NumberInput label="columns" value={columns} min={1} max={6} onChange={setColumns} />
          )}
        </>
      }
    >
      <TopArtists
        layout={layout}
        timeRange={timeRange}
        limit={limit}
        showGenres={showGenres}
        showTimeRangeSelector={showTimeRangeSelector}
        columns={columns}
      />
    </SectionLayout>
  );
}
