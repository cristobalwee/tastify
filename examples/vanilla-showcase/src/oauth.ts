const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'user-read-playback-state',
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-modify-playback-state',
].join(' ');

const STORAGE_KEY_VERIFIER = 'tastify_pkce_verifier';
const STORAGE_KEY_CLIENT_ID = 'tastify_client_id';

function getRedirectUri(): string {
  const url = new URL(window.location.href);
  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1';
  }
  return url.origin + url.pathname;
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function startOAuthFlow(clientId: string): Promise<void> {
  const verifier = generateRandomString(64);
  sessionStorage.setItem(STORAGE_KEY_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId);

  const challenge = base64UrlEncode(await sha256(verifier));
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function handleOAuthCallback(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    window.history.replaceState({}, '', window.location.pathname);
    throw new Error(`Spotify authorization failed: ${error}`);
  }

  if (!code) return null;

  const verifier = sessionStorage.getItem(STORAGE_KEY_VERIFIER);
  const clientId = sessionStorage.getItem(STORAGE_KEY_CLIENT_ID);

  if (!verifier || !clientId) {
    window.history.replaceState({}, '', window.location.pathname);
    throw new Error('Missing PKCE verifier — please try logging in again.');
  }

  const redirectUri = getRedirectUri();

  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
  window.history.replaceState({}, '', window.location.pathname);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data: { access_token: string } = await res.json();
  return data.access_token;
}

export function getSavedClientId(): string {
  return sessionStorage.getItem(STORAGE_KEY_CLIENT_ID) ?? '';
}
