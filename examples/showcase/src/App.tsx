import { useState, useCallback, useRef, useEffect } from 'react';
import { TastifyProvider, PlaybackProvider, PlaybackOverlay, type ToastPosition } from '@tastify/react';
import '@tastify/react/styles.css';
import { NowPlayingSection } from './sections/NowPlayingSection';
import { TopTracksSection } from './sections/TopTracksSection';
import { TopArtistsSection } from './sections/TopArtistsSection';
import { RecentlyPlayedSection } from './sections/RecentlyPlayedSection';
import { PlaybackSection } from './sections/PlaybackSection';
import { startOAuthFlow, handleOAuthCallback, getSavedClientId } from './oauth';

type Section = 'now-playing' | 'top-tracks' | 'top-artists' | 'recently-played' | 'playback';

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'now-playing', label: 'NowPlaying' },
  { id: 'top-tracks', label: 'TopTracks' },
  { id: 'top-artists', label: 'TopArtists' },
  { id: 'recently-played', label: 'RecentlyPlayed' },
  { id: 'playback', label: 'Playback' },
];

function LoginPage({ onConnect, oauthError }: { onConnect: (token: string) => void; oauthError?: string }) {
  const [mode, setMode] = useState<'oauth' | 'token'>('oauth');
  const [clientId, setClientId] = useState(getSavedClientId);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOAuth = async () => {
    const trimmed = clientId.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await startOAuthFlow(trimmed);
    } catch {
      setLoading(false);
    }
  };

  const handleToken = () => {
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
          Connect with Spotify to explore the component showcase.
          Full-track streaming requires a Spotify Premium account.
        </p>

        {oauthError && (
          <p className="login__error">{oauthError}</p>
        )}

        <div className="login__tabs">
          <button
            className={`login__tab${mode === 'oauth' ? ' login__tab--active' : ''}`}
            onClick={() => setMode('oauth')}
          >
            Spotify Login
          </button>
          <button
            className={`login__tab${mode === 'token' ? ' login__tab--active' : ''}`}
            onClick={() => setMode('token')}
          >
            Paste Token
          </button>
        </div>

        {mode === 'oauth' ? (
          <div className="login__form">
            <label className="login__label" htmlFor="login-client-id">
              Spotify Client ID
            </label>
            <input
              id="login-client-id"
              className="login__input"
              type="text"
              placeholder="Your app's Client ID from the Spotify Dashboard"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOAuth()}
              autoFocus
            />
            <button
              className="login__submit"
              onClick={handleOAuth}
              disabled={!clientId.trim() || loading}
            >
              {loading ? 'Redirecting...' : 'Login with Spotify'}
            </button>
            <p className="login__scope-info">
              Requests scopes: <code>user-read-currently-playing</code>{' '}
              <code>user-top-read</code> <code>streaming</code> and more.
              Add <code>{window.location.origin}</code> as a Redirect URI in your{' '}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Spotify app settings
              </a>.
            </p>
          </div>
        ) : (
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
              onKeyDown={(e) => e.key === 'Enter' && handleToken()}
              autoFocus
            />
            <button
              className="login__submit"
              onClick={handleToken}
              disabled={!token.trim()}
            >
              Connect
            </button>
            <p className="login__scope-info">
              For full-track playback, your token must include the{' '}
              <code>streaming</code> and <code>user-modify-playback-state</code>{' '}
              scopes. Without them, playback falls back to 30s previews (mostly
              unavailable since Nov 2024). Use <code>npx tastify init</code> or
              the Spotify Login tab to get a token with the right scopes.
            </p>
          </div>
        )}

        <p className="login__help">
          Need a Client ID?{' '}
          <a
            href="https://developer.spotify.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create an app
          </a>{' '}
          in the Spotify Developer Dashboard.
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
  const [oauthError, setOauthError] = useState('');
  const [section, setSection] = useState<Section>('now-playing');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [playbackUi, setPlaybackUi] = useState<'bar' | 'toast'>('bar');
  const [toastPosition, setToastPosition] = useState<ToastPosition>('bottom-right');

  const handleConnect = useCallback((token: string) => {
    setActiveToken(token);
  }, []);

  useEffect(() => {
    handleOAuthCallback()
      .then((token) => {
        if (token) setActiveToken(token);
      })
      .catch((err) => {
        setOauthError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  if (!activeToken) {
    return <LoginPage onConnect={handleConnect} oauthError={oauthError} />;
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
              <PlaybackProvider ui={playbackUi} toastPosition={toastPosition} playbackMode="auto">
                {section === 'now-playing' && <NowPlayingSection />}
                {section === 'top-tracks' && <TopTracksSection />}
                {section === 'top-artists' && <TopArtistsSection />}
                {section === 'recently-played' && <RecentlyPlayedSection />}
                {section === 'playback' && (
                  <PlaybackSection
                    ui={playbackUi}
                    toastPosition={toastPosition}
                    onUiChange={setPlaybackUi}
                    onPositionChange={setToastPosition}
                  />
                )}
                <PlaybackOverlay />
              </PlaybackProvider>
            </TastifyProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
