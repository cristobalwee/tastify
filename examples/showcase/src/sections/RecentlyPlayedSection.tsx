import { useState } from 'react';
import { RecentlyPlayed } from '@tastify/react';
import { SectionLayout, Toggle, Select, NumberInput } from './Controls';

export function RecentlyPlayedSection() {
  const [layout, setLayout] = useState<'list' | 'timeline'>('list');
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [groupByDay, setGroupByDay] = useState(false);
  const [limit, setLimit] = useState(10);

  const code = `<RecentlyPlayed
  layout="${layout}"
  limit={${limit}}
  showTimestamp={${showTimestamp}}
  groupByDay={${groupByDay}}
/>`;

  return (
    <SectionLayout
      title="RecentlyPlayed"
      description="Shows recently played tracks as a list or timeline, with optional day grouping."
      code={code}
      controls={
        <>
          <Select
            label="layout"
            value={layout}
            options={[
              { value: 'list', label: 'list' },
              { value: 'timeline', label: 'timeline' },
            ]}
            onChange={setLayout}
          />
          <NumberInput label="limit" value={limit} min={1} max={50} onChange={setLimit} />
          <Toggle label="showTimestamp" value={showTimestamp} onChange={setShowTimestamp} />
          <Toggle label="groupByDay" value={groupByDay} onChange={setGroupByDay} />
        </>
      }
    >
      <RecentlyPlayed
        layout={layout}
        limit={limit}
        showTimestamp={showTimestamp}
        groupByDay={groupByDay}
      />
    </SectionLayout>
  );
}
