import { readFileSync } from 'fs'
import { createServer } from 'http'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env vars from packages/cli/.env
const envPath = resolve(__dirname, '../../packages/cli/.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
)

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = env
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

let cachedToken = null
let cachedExpiry = 0

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }

  const now = Date.now()
  if (cachedToken && cachedExpiry - now > 300_000) {
    res.end(
      JSON.stringify({
        access_token: cachedToken,
        expires_in: Math.floor((cachedExpiry - now) / 1000),
      })
    )
    return
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: SPOTIFY_REFRESH_TOKEN,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET,
  })

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) {
    res.writeHead(502)
    res.end(JSON.stringify({ error: 'Token refresh failed' }))
    return
  }

  const data = await response.json()
  cachedToken = data.access_token
  cachedExpiry = now + data.expires_in * 1000

  res.end(
    JSON.stringify({
      access_token: data.access_token,
      expires_in: data.expires_in,
    })
  )
})

server.listen(8888, () => {
  console.log('Token server running at http://localhost:8888')
})
