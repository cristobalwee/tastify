export function cloudflareTemplate(): string {
  return `// functions/api/spotify/token.ts
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

let cachedToken: string | null = null
let cachedExpiry = 0

interface Env {
  SPOTIFY_CLIENT_ID: string
  SPOTIFY_CLIENT_SECRET: string
  SPOTIFY_REFRESH_TOKEN: string
  ALLOWED_ORIGIN?: string
}

export async function onRequest(context: { request: Request; env: Env }) {
  const { request, env } = context
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  const now = Date.now()
  if (cachedToken && cachedExpiry - now > 300_000) {
    return new Response(
      JSON.stringify({
        access_token: cachedToken,
        expires_in: Math.floor((cachedExpiry - now) / 1000),
      }),
      { headers }
    )
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.SPOTIFY_REFRESH_TOKEN,
    client_id: env.SPOTIFY_CLIENT_ID,
    client_secret: env.SPOTIFY_CLIENT_SECRET,
  })

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
      status: 502,
      headers,
    })
  }

  const data: { access_token: string; expires_in: number; refresh_token?: string } =
    await response.json()
  cachedToken = data.access_token
  cachedExpiry = now + data.expires_in * 1000

  if (data.refresh_token) {
    console.warn('[tastify] Spotify rotated refresh token. Update SPOTIFY_REFRESH_TOKEN env var.')
  }

  return new Response(
    JSON.stringify({
      access_token: data.access_token,
      expires_in: data.expires_in,
    }),
    { headers }
  )
}
`
}

export const cloudflarePath = 'functions/api/spotify/token.ts'
