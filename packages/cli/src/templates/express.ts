export function expressTemplate(): string {
  return `// routes/spotify-token.ts
import express from 'express'

const router = express.Router()
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

let cachedToken: string | null = null
let cachedExpiry = 0

router.get('/api/spotify/token', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Cache-Control', 'no-store')

  const now = Date.now()
  if (cachedToken && cachedExpiry - now > 300_000) {
    return res.json({
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

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'Token refresh failed' })
    }

    const data = await response.json()
    cachedToken = data.access_token
    cachedExpiry = now + data.expires_in * 1000

    if (data.refresh_token) {
      console.warn('[tastify] Spotify rotated refresh token. Update SPOTIFY_REFRESH_TOKEN env var.')
    }

    return res.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    })
  } catch {
    return res.status(500).json({ error: 'Failed to refresh token' })
  }
})

export default router
`
}

export const expressPath = 'routes/spotify-token.ts'
