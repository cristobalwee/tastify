import { useState, useCallback, useRef, useEffect } from 'react';
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

function LoginPage({ onConnect }: { onConnect: (token: string) => void }) {
  const [token, setToken] = useState('');

  const handleSubmit = () => {
    const trimmed = token.trim();
    if (trimmed) onConnect(trimmed);
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <div className="login__logo">tastify</div>
          <p className="login__tagline">Spotify components for React</p>
        </div>

        <p className="login__description">
          Connect with a Spotify access token to explore the component showcase.
          Each component is interactive with live prop controls.
        </p>

        <div className="login__form">
          <label className="login__label" htmlFor="login-token">
            Access Token
          </label>
          <input
            id="login-token"
            className="login__input"
            type="password"
            placeholder="Paste your Spotify access token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <button
            className="login__submit"
            onClick={handleSubmit}
            disabled={!token.trim()}
          >
            Connect
          </button>
        </div>

        <p className="login__help">
          Generate a token from the{' '}
          <a
            href="https://developer.spotify.com/documentation/web-api/concepts/access-token"
            target="_blank"
            rel="noopener noreferrer"
          >
            Spotify Developer Docs
          </a>{' '}
          or run <code>npx tastify init</code> to get started.
        </p>
      </div>
    </div>
  );
}

function TokenFlyout({
  isOpen,
  onClose,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (token: string) => void;
}) {
  const [newToken, setNewToken] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNewToken('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = () => {
    const trimmed = newToken.trim();
    if (trimmed) {
      onUpdate(trimmed);
      onClose();
    }
  };

  return (
    <>
      <div className="showcase__flyout-overlay" onClick={onClose} />
      <div className="showcase__flyout">
        <label className="showcase__flyout-label">New Access Token</label>
        <input
          ref={inputRef}
          className="showcase__flyout-input"
          type="password"
          placeholder="Paste a new token..."
          value={newToken}
          onChange={(e) => setNewToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
        />
        <button
          className="showcase__flyout-btn"
          onClick={handleUpdate}
          disabled={!newToken.trim()}
        >
          Connect
        </button>
      </div>
    </>
  );
}

export function App() {
  const [activeToken, setActiveToken] = useState('');
  const [section, setSection] = useState<Section>('now-playing');
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const handleConnect = useCallback((token: string) => {
    setActiveToken(token);
  }, []);

  if (!activeToken) {
    return <LoginPage onConnect={handleConnect} />;
  }

  return (
    <div className="showcase">
      <div className="showcase__header-bar">
      <header className="showcase__header">
        <h1 className="showcase__title">
          <span className="showcase__logo">tastify</span>
          <span className="showcase__subtitle">showcase</span>
        </h1>
        <div className="showcase__header-right">
          <span className="showcase__status">
            <span className="showcase__status-dot" />
            Connected
          </span>
          <button
            className={`showcase__dropdown-trigger${flyoutOpen ? ' showcase__dropdown-trigger--open' : ''}`}
            onClick={() => setFlyoutOpen(!flyoutOpen)}
          >
            Update token
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4.5 L6 7.5 L9 4.5" />
            </svg>
          </button>
          <TokenFlyout
            isOpen={flyoutOpen}
            onClose={() => setFlyoutOpen(false)}
            onUpdate={handleConnect}
          />
        </div>
      </header>
      </div>

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

        <div className="showcase__main-wrapper">
          <main className="showcase__main">
            <TastifyProvider token={activeToken}>
              {section === 'now-playing' && <NowPlayingSection />}
              {section === 'top-tracks' && <TopTracksSection />}
              {section === 'top-artists' && <TopArtistsSection />}
              {section === 'recently-played' && <RecentlyPlayedSection />}
            </TastifyProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
