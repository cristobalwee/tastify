import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { URL } from 'node:url'
import prompts from 'prompts'
import pc from 'picocolors'
import open from 'open'
import { vercelTemplate, vercelPath } from './templates/vercel.js'
import { netlifyTemplate, netlifyPath } from './templates/netlify.js'
import { cloudflareTemplate, cloudflarePath } from './templates/cloudflare.js'
import { expressTemplate, expressPath } from './templates/express.js'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPES = 'user-read-currently-playing user-read-recently-played user-top-read user-read-playback-state'

interface Platform {
  title: string
  value: string
  template: () => string
  filePath: string
}

const platforms: Platform[] = [
  { title: 'Vercel (serverless function)', value: 'vercel', template: vercelTemplate, filePath: vercelPath },
  { title: 'Netlify (edge function)', value: 'netlify', template: netlifyTemplate, filePath: netlifyPath },
  { title: 'Cloudflare Workers', value: 'cloudflare', template: cloudflareTemplate, filePath: cloudflarePath },
  { title: 'Generic Node / Express', value: 'express', template: expressTemplate, filePath: expressPath },
]

function banner() {
  console.log()
  console.log(pc.gray('╭──────────────────────────────────────────╮'))
  console.log(pc.gray('│') + '                                          ' + pc.gray('│'))
  console.log(pc.gray('│') + `   ${pc.green(pc.bold('tastify'))} ${pc.dim('— Spotify widget setup')}         ` + pc.gray('│'))
  console.log(pc.gray('│') + '                                          ' + pc.gray('│'))
  console.log(pc.gray('╰──────────────────────────────────────────╯'))
  console.log()
}

function abort() {
  console.log(pc.yellow('\nSetup cancelled.'))
  process.exit(0)
}

async function runOAuth(
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string }> {
  const redirectUrl = new URL(redirectUri)
  const port = parseInt(redirectUrl.port, 10) || 3000

  return new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`)

      if (url.pathname !== redirectUrl.pathname) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (error || !code) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Authorization failed.</h2><p>You can close this tab.</p></body></html>')
        cleanup()
        reject(new Error(error || 'No authorization code received'))
        return
      }

      // Exchange code for tokens
      try {
        const params = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        })

        const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })

        if (!tokenRes.ok) {
          const body = await tokenRes.text()
          throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`)
        }

        const data: { access_token: string; refresh_token: string } = await tokenRes.json()

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Authorized!</h2><p>You can close this tab and return to the terminal.</p></body></html>')
        cleanup()
        resolve(data)
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end('<html><body><h2>Token exchange failed.</h2><p>Check the terminal for details.</p></body></html>')
        cleanup()
        reject(err)
      }
    })

    function cleanup() {
      server.close()
    }

    // Handle SIGINT gracefully
    const onSigint = () => {
      cleanup()
      console.log(pc.yellow('\nInterrupted. Cleaning up...'))
      process.exit(1)
    }
    process.on('SIGINT', onSigint)

    server.on('close', () => {
      process.off('SIGINT', onSigint)
    })

    server.listen(port, () => {
      const authUrl = new URL(SPOTIFY_AUTH_URL)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('scope', SCOPES)

      console.log(pc.dim('  Opening browser for authorization...'))
      console.log(pc.dim(`  If it doesn't open, visit:`))
      console.log(pc.dim(`  ${authUrl.toString()}`))
      console.log()

      open(authUrl.toString()).catch(() => {
        // Browser failed to open — URL is printed above
      })
    })

    server.on('error', (err) => {
      reject(new Error(`Failed to start local server on port ${port}: ${(err as NodeJS.ErrnoException).message}`))
    })
  })
}

function writeFile(filePath: string, content: string) {
  const fullPath = path.resolve(process.cwd(), filePath)
  fs.mkdirSync(path.dirname(fullPath), { recursive: true })
  fs.writeFileSync(fullPath, content, 'utf-8')
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] !== 'init') {
    console.log(`
  ${pc.green(pc.bold('tastify'))} — Spotify widget setup CLI

  ${pc.bold('Usage:')}
    npx tastify init    Set up your Spotify token endpoint
`)
    process.exit(args.length === 0 ? 0 : 1)
  }

  banner()

  const onCancel = () => abort()

  const { clientId } = await prompts({
    type: 'text',
    name: 'clientId',
    message: 'Spotify Client ID',
    validate: (v: string) => v.trim().length > 0 || 'Client ID is required',
  }, { onCancel })

  const { clientSecret } = await prompts({
    type: 'password',
    name: 'clientSecret',
    message: 'Spotify Client Secret',
    validate: (v: string) => v.trim().length > 0 || 'Client Secret is required',
  }, { onCancel })

  const { platformIndex } = await prompts({
    type: 'select',
    name: 'platformIndex',
    message: 'Deployment platform',
    choices: platforms.map((p, i) => ({ title: p.title, value: i })),
  }, { onCancel })

  const platform = platforms[platformIndex]!

  const { redirectUri } = await prompts({
    type: 'text',
    name: 'redirectUri',
    message: 'Redirect URI',
    initial: 'http://localhost:3000/callback',
  }, { onCancel })

  // OAuth flow
  console.log()
  console.log(pc.dim('  Starting OAuth flow...'))

  let tokens: { access_token: string; refresh_token: string }
  try {
    tokens = await runOAuth(clientId.trim(), clientSecret.trim(), redirectUri.trim())
    console.log(pc.green('  ✓ Authorized! Tokens obtained.'))
  } catch (err) {
    console.error(pc.red(`  ✗ OAuth failed: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }

  // Write the serverless function
  console.log()
  try {
    writeFile(platform.filePath, platform.template())
    console.log(pc.green(`  ✓ Created ${platform.filePath}`))
  } catch (err) {
    console.error(pc.red(`  ✗ Failed to write ${platform.filePath}: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }

  // Write .env.local
  const envFile = platform.value === 'cloudflare' ? '.env' : '.env.local'
  const envContent = `SPOTIFY_CLIENT_ID=${clientId.trim()}
SPOTIFY_CLIENT_SECRET=${clientSecret.trim()}
SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}
`

  try {
    writeFile(envFile, envContent)
    console.log(pc.green(`  ✓ Created ${envFile}`))
  } catch (err) {
    console.error(pc.red(`  ✗ Failed to write ${envFile}: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }

  // Success message
  console.log()
  console.log(pc.green(pc.bold('  ✓ Done!')) + ' Files created:')
  console.log(pc.dim(`    → ${platform.filePath}`))
  console.log(pc.dim(`    → ${envFile}`))
  console.log()
  console.log(pc.bold('  Access token (expires in ~1 hour):'))
  console.log()
  console.log(`  ${tokens.access_token}`)
  console.log()
  console.log('  Next steps:')
  console.log('  1. Add the env vars to your deployment platform')
  console.log('  2. Deploy your site')
  console.log('  3. Add tastify to your project:')
  console.log()
  console.log(pc.cyan('     npm install @tastify/react'))
  console.log(pc.dim('     # or'))
  console.log(pc.cyan('     <script src="https://unpkg.com/@tastify/vanilla"></script>'))
  console.log()
}

main().catch((err) => {
  console.error(pc.red(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`))
  process.exit(1)
})
