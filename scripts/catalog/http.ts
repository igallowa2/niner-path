/**
 * Polite, cached page fetching for catalog.charlotte.edu.
 *
 * robots.txt (checked 2026-11-16) allows course and program pages for all user agents,
 * blocks /portfolio.php, /portfolio_nopop.php, /ajax/, /search_advanced.php, and asks for
 * `crawl-delay: 120`. So we:
 *   - refuse to fetch the blocked paths,
 *   - wait at least 120 seconds between requests (tracked in a file, so it holds across runs),
 *   - cache every page on disk and never download the same URL twice.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const BASE_URL = 'https://catalog.charlotte.edu'
const CRAWL_DELAY_MS = 120_000
const BLOCKED = ['/portfolio.php', '/portfolio_nopop.php', '/ajax/', '/search_advanced.php']
const USER_AGENT = 'NinerPathCatalogBot/1.0 (student course-planning project; polite, cached, 1 request per 120s)'

export const CACHE_DIR = join(import.meta.dirname, '.cache')
const LAST_REQUEST_FILE = join(CACHE_DIR, '.last-request')

function cachePath(url: string): string {
  return join(CACHE_DIR, `${createHash('sha1').update(url).digest('hex')}.html`)
}

export function isCached(url: string): boolean {
  return existsSync(cachePath(url))
}

/** Absolute URL for a catalog path like "content.php?catoid=42". */
export function catalogUrl(path: string): string {
  return new URL(path, `${BASE_URL}/`).toString()
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Returns the page HTML from the cache, or downloads it (waiting for the crawl delay first). */
export async function getPage(url: string, log: (msg: string) => void = console.log): Promise<string> {
  const path = new URL(url).pathname
  if (BLOCKED.some((b) => path.startsWith(b))) throw new Error(`robots.txt disallows ${path}`)

  mkdirSync(CACHE_DIR, { recursive: true })
  const file = cachePath(url)
  if (existsSync(file)) return readFileSync(file, 'utf8')

  const last = existsSync(LAST_REQUEST_FILE) ? Number(readFileSync(LAST_REQUEST_FILE, 'utf8')) : 0
  const waitMs = last + CRAWL_DELAY_MS - Date.now()
  if (waitMs > 0) {
    log(`  waiting ${Math.ceil(waitMs / 1000)}s (crawl-delay) before ${url}`)
    await wait(waitMs)
  }

  writeFileSync(LAST_REQUEST_FILE, String(Date.now()))
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  // The site may answer with a bot check (AWS WAF) instead of the page. We never try to get
  // around it: stop, don't cache it, and use pages saved from a browser instead (see README).
  if (/awswaf|verify that you're not a robot|challenge-container/i.test(html)) {
    throw new Error(`The catalog returned a bot check for ${url}. Stopping without retrying; save the pages from your browser instead.`)
  }
  writeFileSync(file, html)
  log(`  fetched ${url} (${Math.round(html.length / 1024)} KB)`)
  return html
}
