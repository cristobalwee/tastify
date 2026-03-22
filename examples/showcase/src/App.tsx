import { useState, useCallback } from 'react';
import { TastifyProvider } from '@tastify/react';
import '@tastify/react/styles.css';
import { NowPlayingSection } from './sections/NowPlayingSection';
import { TopTracksSection } from './sections/TopTracksSection';
import { TopArtistsSection } from './sections/TopArtistsSection';
import { RecentlyPlayedSection } from './sections/RecentlyPlayedSection';

type Section = 'now-playing' | 'top-tracks' | 'top-artists' | 'recently-played';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'now-playing', label: 'NowPlaying' },
  { id: 'top-tracks', label: 'TopTracks' },
  { id: 'top-artists', label: 'TopArtists' },
  { id: 'recently-played', label: 'RecentlyPlayed' },
];

export function App() {
  const [token, setToken] = useState('');
  const [activeToken, setActiveToken] = useState('');
  const [section, setSection] = useState<Section>('now-playing');

  const handleConnect = useCallback(() => {
    setActiveToken(token.trim());
  }, [token]);

  return (
    <div className="showcase">
      <header className="showcase__header">
        <h1 className="showcase__title">
          <span className="showcase__logo">tastify</span>
          <span className="showcase__subtitle">showcase</span>
        </h1>
        <div className="showcase__token-bar">
          <input
            className="showcase__token-input"
            type="password"
            placeholder="Paste your Spotify access token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
          <button
            className="showcase__connect-btn"
            onClick={handleConnect}
            disabled={!token.trim()}
          >
            {activeToken ? 'Reconnect' : 'Connect'}
          </button>
          {activeToken && <span className="showcase__status">Connected</span>}
        </div>
      </header>

      <div className="showcase__body">
        <nav className="showcase__nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`showcase__nav-btn${section === item.id ? ' showcase__nav-btn--active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="showcase__main">
          {!activeToken ? (
            <div className="showcase__empty">
              <p>Paste a Spotify access token above to get started.</p>
              <p className="showcase__hint">
                You can get one from{' '}
                <a
                  href="https://developer.spotify.com/documentation/web-api/concepts/access-token"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Spotify&apos;s developer docs
                </a>{' '}
                or by running <code>npx tastify init</code>.
              </p>
            </div>
          ) : (
            <TastifyProvider token={activeToken}>
              {section === 'now-playing' && <NowPlayingSection />}
              {section === 'top-tracks' && <TopTracksSection />}
              {section === 'top-artists' && <TopArtistsSection />}
              {section === 'recently-played' && <RecentlyPlayedSection />}
            </TastifyProvider>
          )}
        </main>
      </div>
    </div>
  );
}
