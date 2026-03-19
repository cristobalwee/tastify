export function netlifyTemplate(): string {
  return `// netlify/edge-functions/spotify-token.ts
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

let cachedToken: string | null = null
let cachedExpiry = 0

export default async (request: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
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
    refresh_token: Deno.env.get('SPOTIFY_REFRESH_TOKEN')!,
    client_id: Deno.env.get('SPOTIFY_CLIENT_ID')!,
    client_secret: Deno.env.get('SPOTIFY_CLIENT_SECRET')!,
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

  const data = await response.json()
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

export const config = { path: '/api/spotify/token' }
`
}

export const netlifyPath = 'netlify/edge-functions/spotify-token.ts'
