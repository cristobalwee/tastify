import { useState } from 'react';
import {
  TastifyProvider,
  PlaybackProvider,
  PlaybackOverlay,
  NowPlaying,
  TopTracks,
  TopArtists,
  RecentlyPlayed,
} from '@tastify/react';
import type { ToastPosition } from '@tastify/react';

type TimeRange = 'short_term' | 'medium_term' | 'long_term';

/* ── tiny control primitives ─────────────────── */

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="pg-toggle">
      <span className="pg-toggle__label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`pg-toggle__track ${value ? 'pg-toggle__track--on' : ''}`}
        onClick={() => onChange(!value)}
      >
        <span className="pg-toggle__thumb" />
      </button>
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="pg-select">
      <span className="pg-select__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="pg-select">
      <span className="pg-select__label">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ── component sections ──────────────────────── */

const tabs = ['NowPlaying', 'TopTracks', 'TopArtists', 'RecentlyPlayed', 'Playback'] as const;
type Tab = (typeof tabs)[number];

function NowPlayingSection() {
  const [showArt, setShowArt] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showLink, setShowLink] = useState(true);
  const [compact, setCompact] = useState(false);

  const props = Object.entries({ showArt, showProgress, showLink, compact })
    .filter(([, v]) => v !== true || ['compact'].includes(''))
    .map(([k, v]) => (v === true ? k : v === false ? null : `${k}="${v}"`))
    .filter(Boolean);

  const code = `<NowPlaying${compact ? ' compact' : ''}${!showArt ? ' showArt={false}' : ''}${!showProgress ? ' showProgress={false}' : ''}${!showLink ? ' showLink={false}' : ''} />`;

  return (
    <div className="pg-section">
      <div className="pg-controls">
        <Toggle label="showArt" value={showArt} onChange={setShowArt} />
        <Toggle label="showProgress" value={showProgress} onChange={setShowProgress} />
        <Toggle label="showLink" value={showLink} onChange={setShowLink} />
        <Toggle label="compact" value={compact} onChange={setCompact} />
      </div>
      <div className="pg-preview">
        <NowPlaying
          showArt={showArt}
          showProgress={showProgress}
          showLink={showLink}
          compact={compact}
          fallback={<p className="pg-fallback">Nothing playing right now — play something on Spotify!</p>}
        />
      </div>
      <pre className="pg-code"><code>{code}</code></pre>
    </div>
  );
}

function TopTracksSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term');
  const [limit, setLimit] = useState(5);
  const [layout, setLayout] = useState<'list' | 'grid'>('list');
  const [showRank, setShowRank] = useState(true);
  const [showArt, setShowArt] = useState(true);
  const [columns, setColumns] = useState(3);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);

  const codeParts = ['<TopTracks'];
  if (timeRange !== 'medium_term') codeParts.push(`  timeRange="${timeRange}"`);
  if (limit !== 5) codeParts.push(`  limit={${limit}}`);
  if (layout !== 'list') codeParts.push(`  layout="${layout}"`);
  if (!showRank) codeParts.push('  showRank={false}');
  if (!showArt) codeParts.push('  showArt={false}');
  if (layout === 'grid' && columns !== 3) codeParts.push(`  columns={${columns}}`);
  if (showTimeRangeSelector) codeParts.push('  showTimeRangeSelector');
  codeParts.push('/>');
  const code = codeParts.length <= 2 ? codeParts.join(' ') : codeParts.join('\n');

  return (
    <div className="pg-section">
      <div className="pg-controls">
        <Select
          label="timeRange"
          value={timeRange}
          options={[
            { value: 'short_term', label: 'Last 4 weeks' },
            { value: 'medium_term', label: 'Last 6 months' },
            { value: 'long_term', label: 'All time' },
          ]}
          onChange={setTimeRange}
        />
        <NumberInput label="limit" value={limit} min={1} max={10} onChange={setLimit} />
        <Select
          label="layout"
          value={layout}
          options={[
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
          ]}
          onChange={setLayout}
        />
        {layout === 'grid' && (
          <NumberInput label="columns" value={columns} min={2} max={5} onChange={setColumns} />
        )}
        <Toggle label="showRank" value={showRank} onChange={setShowRank} />
        <Toggle label="showArt" value={showArt} onChange={setShowArt} />
        <Toggle label="showTimeRangeSelector" value={showTimeRangeSelector} onChange={setShowTimeRangeSelector} />
      </div>
      <div className="pg-preview">
        <TopTracks
          timeRange={timeRange}
          limit={limit}
          layout={layout}
          showRank={showRank}
          showArt={showArt}
          columns={columns}
          showTimeRangeSelector={showTimeRangeSelector}
        />
      </div>
      <pre className="pg-code"><code>{code}</code></pre>
    </div>
  );
}

function TopArtistsSection() {
  const [timeRange, setTimeRange] = useState<TimeRange>('medium_term');
  const [limit, setLimit] = useState(6);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [columns, setColumns] = useState(3);
  const [showGenres, setShowGenres] = useState(false);
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);

  const codeParts = ['<TopArtists'];
  if (timeRange !== 'medium_term') codeParts.push(`  timeRange="${timeRange}"`);
  if (limit !== 6) codeParts.push(`  limit={${limit}}`);
  if (layout !== 'grid') codeParts.push(`  layout="${layout}"`);
  if (columns !== 3) codeParts.push(`  columns={${columns}}`);
  if (showGenres) codeParts.push('  showGenres');
  if (showTimeRangeSelector) codeParts.push('  showTimeRangeSelector');
  codeParts.push('/>');
  const code = codeParts.length <= 2 ? codeParts.join(' ') : codeParts.join('\n');

  return (
    <div className="pg-section">
      <div className="pg-controls">
        <Select
          label="timeRange"
          value={timeRange}
          options={[
            { value: 'short_term', label: 'Last 4 weeks' },
            { value: 'medium_term', label: 'Last 6 months' },
            { value: 'long_term', label: 'All time' },
          ]}
          onChange={setTimeRange}
        />
        <NumberInput label="limit" value={limit} min={1} max={12} onChange={setLimit} />
        <Select
          label="layout"
          value={layout}
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'List' },
          ]}
          onChange={setLayout}
        />
        {layout === 'grid' && (
          <NumberInput label="columns" value={columns} min={2} max={5} onChange={setColumns} />
        )}
        <Toggle label="showGenres" value={showGenres} onChange={setShowGenres} />
        <Toggle label="showTimeRangeSelector" value={showTimeRangeSelector} onChange={setShowTimeRangeSelector} />
      </div>
      <div className="pg-preview">
        <TopArtists
          timeRange={timeRange}
          limit={limit}
          layout={layout}
          columns={columns}
          showGenres={showGenres}
          showTimeRangeSelector={showTimeRangeSelector}
        />
      </div>
      <pre className="pg-code"><code>{code}</code></pre>
    </div>
  );
}

function RecentlyPlayedSection() {
  const [limit, setLimit] = useState(10);
  const [layout, setLayout] = useState<'list' | 'timeline'>('list');
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [groupByDay, setGroupByDay] = useState(false);

  const codeParts = ['<RecentlyPlayed'];
  if (limit !== 10) codeParts.push(`  limit={${limit}}`);
  if (layout !== 'list') codeParts.push(`  layout="${layout}"`);
  if (!showTimestamp) codeParts.push('  showTimestamp={false}');
  if (groupByDay) codeParts.push('  groupByDay');
  codeParts.push('/>');
  const code = codeParts.length <= 2 ? codeParts.join(' ') : codeParts.join('\n');

  return (
    <div className="pg-section">
      <div className="pg-controls">
        <NumberInput label="limit" value={limit} min={1} max={20} onChange={setLimit} />
        <Select
          label="layout"
          value={layout}
          options={[
            { value: 'list', label: 'List' },
            { value: 'timeline', label: 'Timeline' },
          ]}
          onChange={setLayout}
        />
        <Toggle label="showTimestamp" value={showTimestamp} onChange={setShowTimestamp} />
        <Toggle label="groupByDay" value={groupByDay} onChange={setGroupByDay} />
      </div>
      <div className="pg-preview">
        <RecentlyPlayed
          limit={limit}
          layout={layout}
          showTimestamp={showTimestamp}
          groupByDay={groupByDay}
        />
      </div>
      <pre className="pg-code"><code>{code}</code></pre>
    </div>
  );
}

function PlaybackSection() {
  const [ui, setUi] = useState<'bar' | 'toast'>('toast');
  const [toastPosition, setToastPosition] = useState<ToastPosition>('bottom-right');

  const codeParts = [`<PlaybackProvider ui="${ui}"`];
  if (ui === 'toast' && toastPosition !== 'bottom-right') codeParts.push(`  toastPosition="${toastPosition}"`);
  codeParts.push('>');
  codeParts.push('  {/* your components */}');
  codeParts.push('  <PlaybackOverlay />');
  codeParts.push('</PlaybackProvider>');
  const code = codeParts.join('\n');

  return (
    <div className="pg-section">
      <div className="pg-controls">
        <Select
          label="ui"
          value={ui}
          options={[
            { value: 'toast', label: 'Toast' },
            { value: 'bar', label: 'Bar' },
          ]}
          onChange={setUi}
        />
        {ui === 'toast' && (
          <Select
            label="toastPosition"
            value={toastPosition}
            options={[
              { value: 'top-left', label: 'Top Left' },
              { value: 'top-center', label: 'Top Center' },
              { value: 'top-right', label: 'Top Right' },
              { value: 'bottom-left', label: 'Bottom Left' },
              { value: 'bottom-center', label: 'Bottom Center' },
              { value: 'bottom-right', label: 'Bottom Right' },
            ]}
            onChange={setToastPosition}
          />
        )}
      </div>
      <div className="pg-preview pg-preview--playback">
        <p className="pg-fallback">
          Click play on any track above to see the <strong>{ui === 'toast' ? 'toast' : 'bar'}</strong> player in action.
        </p>
      </div>
      <pre className="pg-code"><code>{code}</code></pre>
    </div>
  );
}

/* ── main playground ─────────────────────────── */

export default function ComponentPlayground() {
  const tokenUrl = import.meta.env.PUBLIC_TASTIFY_TOKEN_URL as string | undefined;
  const [activeTab, setActiveTab] = useState<Tab>('NowPlaying');

  /* playback config lives here so it can be changed from the Playback tab */
  const [playbackUi, setPlaybackUi] = useState<'bar' | 'toast'>('toast');
  const [toastPosition, setToastPosition] = useState<ToastPosition>('bottom-right');

  if (!tokenUrl) {
    return (
      <section className="section" id="playground">
        <div className="container" style={{ textAlign: 'center', color: 'var(--landing-text-muted)' }}>
          <h2 className="section__title">Component Playground</h2>
          <p>Set <code>PUBLIC_TASTIFY_TOKEN_URL</code> in your <code>.env</code> to try the interactive playground.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" id="playground">
      <div className="container">
        <h2 className="section__title">Component Playground</h2>
        <p className="section__subtitle">
          Explore every component, tweak their props, and see live results with your own Spotify data.
        </p>

        <TastifyProvider tokenUrl={tokenUrl}>
          <PlaybackProvider ui={playbackUi} toastPosition={toastPosition} playbackMode="embed">
            <div className="pg-body">
              <div className="pg-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={`pg-tab ${activeTab === tab ? 'pg-tab--active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {activeTab === 'NowPlaying' && <NowPlayingSection />}
              {activeTab === 'TopTracks' && <TopTracksSection />}
              {activeTab === 'TopArtists' && <TopArtistsSection />}
              {activeTab === 'RecentlyPlayed' && <RecentlyPlayedSection />}
              {activeTab === 'Playback' && (
                <PlaybackSectionWrapper
                  ui={playbackUi}
                  toastPosition={toastPosition}
                  onUiChange={setPlaybackUi}
                  onPositionChange={setToastPosition}
                />
              )}
            </div>

            <PlaybackOverlay />
          </PlaybackProvider>
        </TastifyProvider>
      </div>
    </section>
  );
}

/* Wrapper that hoists playback config changes up */
function PlaybackSectionWrapper({
  ui,
  toastPosition,
  onUiChange,
  onPositionChange,
}: {
  ui: 'bar' | 'toast';
  toastPosition: ToastPosition;
  onUiChange: (v: 'bar' | 'toast') => void;
  onPositionChange: (v: ToastPosition) => void;
}) {
  const codeParts = [`<PlaybackProvider ui="${ui}"`];
  if (ui === 'toast' && toastPosition !== 'bottom-right') codeParts.push(`  toastPosition="${toastPosition}"`);
  codeParts.push('>');
  codeParts.push('  {/* your components */}');
  codeParts.push('  <PlaybackOverlay />');
  codeParts.push('</PlaybackProvider>');
  const code = codeParts.join('\n');

  return (
    <div className="pg-section">
      <div className="pg-controls">
        <Select
          label="ui"
          value={ui}
          options={[
            { value: 'toast', label: 'Toast' },
            { value: 'bar', label: 'Bar' },
          ]}
          onChange={onUiChange}
        />
        {ui === 'toast' && (
          <Select
            label="toastPosition"
            value={toastPosition}
            options={[
              { value: 'top-left', label: 'Top Left' },
              { value: 'top-center', label: 'Top Center' },
              { value: 'top-right', label: 'Top Right' },
              { value: 'bottom-left', label: 'Bottom Left' },
              { value: 'bottom-center', label: 'Bottom Center' },
              { value: 'bottom-right', label: 'Bottom Right' },
            ]}
            onChange={onPositionChange}
          />
        )}
      </div>
      <div className="pg-preview pg-preview--playback">
        <p className="pg-fallback">
          Click play on any track in the other tabs to see the <strong>{ui === 'toast' ? 'toast' : 'bar'}</strong> player in action.
        </p>
      </div>
      <pre className="pg-code"><code>{code}</code></pre>
    </div>
  );
}
