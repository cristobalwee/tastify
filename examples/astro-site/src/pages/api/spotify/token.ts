import type { APIRoute } from 'astro'

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

let cachedToken: string | null = null
let cachedExpiry = 0

export const GET: APIRoute = async () => {
  const now = Date.now()
  if (cachedToken && cachedExpiry - now > 300_000) {
    return new Response(
      JSON.stringify({
        access_token: cachedToken,
        expires_in: Math.floor((cachedExpiry - now) / 1000),
      }),
      { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    )
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: import.meta.env.SPOTIFY_REFRESH_TOKEN,
    client_id: import.meta.env.SPOTIFY_CLIENT_ID,
    client_secret: import.meta.env.SPOTIFY_CLIENT_SECRET,
  })

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = await response.json()
  cachedToken = data.access_token
  cachedExpiry = now + data.expires_in * 1000

  return new Response(
    JSON.stringify({
      access_token: data.access_token,
      expires_in: data.expires_in,
    }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  )
}
