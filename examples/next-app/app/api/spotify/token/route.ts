const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

let cachedToken: string | null = null
let cachedExpiry = 0

export async function GET() {
  const now = Date.now()
  if (cachedToken && cachedExpiry - now > 300_000) {
    return Response.json({
      access_token: cachedToken,
      expires_in: Math.floor((cachedExpiry - now) / 1000),
    })
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  })

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    return Response.json({ error: 'Token refresh failed' }, { status: 502 })
  }

  const data = await response.json()
  cachedToken = data.access_token
  cachedExpiry = now + data.expires_in * 1000

  if (data.refresh_token) {
    console.warn('[tastify] Spotify rotated refresh token. Update SPOTIFY_REFRESH_TOKEN env var.')
  }

  return Response.json({
    access_token: data.access_token,
    expires_in: data.expires_in,
  })
}
