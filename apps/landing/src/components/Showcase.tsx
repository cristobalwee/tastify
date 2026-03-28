import {
  TastifyProvider,
  PlaybackProvider,
  PlaybackOverlay,
  RecentlyPlayed,
  TopArtists,
} from '@tastify/react';

export default function Showcase() {
  const tokenUrl = import.meta.env.PUBLIC_TASTIFY_TOKEN_URL as string | undefined;

  if (!tokenUrl) {
    return (
      <section className="showcase-section">
        <div className="showcase-panels" style={{ justifyItems: 'center', padding: '3rem 2rem', textAlign: 'center', color: 'var(--landing-text-muted)' }}>
          <p>Set <code>PUBLIC_TASTIFY_TOKEN_URL</code> in your <code>.env</code> to see live Spotify data.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="showcase-section">
      <div className="showcase-annotation">
        <span className="showcase-annotation__label">
          Try playing a song
          <svg viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c0 8-6 12-6 18" />
            <path d="M6 20l-4-3" />
            <path d="M6 20l4-3" />
          </svg>
        </span>
      </div>

      <TastifyProvider tokenUrl={tokenUrl}>
        <PlaybackProvider ui="toast" toastPosition="bottom-right" playbackMode="embed">
          <div className="showcase-panels">
            <div className="showcase-panel">
              <RecentlyPlayed limit={8} />
            </div>
            <div className="showcase-panel">
              <TopArtists
                limit={9}
                layout="grid"
                columns={3}
                showTimeRangeSelector
              />
            </div>
          </div>
          <PlaybackOverlay />
        </PlaybackProvider>
      </TastifyProvider>
    </section>
  );
}
