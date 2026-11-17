/**
 * Starts the Niner Path API server.
 * Run with `npm run server` (API only) or `npm run dev` (API and React app together).
 */
import { createApp } from './app'

// Load settings and keys from .env (Node's built-in loader). If .env doesn't exist yet,
// the server still starts; Find Jobs / Explore Careers reply "not configured".
try {
  process.loadEnvFile('.env')
} catch {
  console.warn('No .env file found. Copy .env.example to .env and fill it in.')
}

const port = Number(process.env.PORT) || 3001

const app = createApp({
  adzunaAppId: process.env.ADZUNA_APP_ID,
  adzunaAppKey: process.env.ADZUNA_APP_KEY,
  adzunaCountry: process.env.ADZUNA_COUNTRY,
  onetApiKey: process.env.ONET_API_KEY,
})

// 127.0.0.1 = only reachable from this computer during development.
app.listen(port, '127.0.0.1', () => {
  console.log(`Niner Path API running at http://localhost:${port}/api/applications`)
})
