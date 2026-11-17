/**
 * Step 0: find the catalog's navigation links (course descriptions, programs) for the
 * current catalog. Prints what it finds so the config in programs.config.ts can be filled in.
 * Run: npx tsx scripts/catalog/discover.ts
 */
import { JSDOM } from 'jsdom'
import { catalogUrl, getPage } from './http'

const CATOID = Number(process.env.CATOID ?? 42) // 2026-2027 Undergraduate Catalog

const html = await getPage(catalogUrl(`index.php?catoid=${CATOID}`))
const doc = new JSDOM(html).window.document

console.log(`\nCatalog title: ${doc.title}`)
console.log('\nNavigation links:')
for (const a of doc.querySelectorAll<HTMLAnchorElement>('a[href*="navoid="]')) {
  const text = a.textContent?.replace(/\s+/g, ' ').trim()
  if (text) console.log(`  ${text}  ->  ${a.getAttribute('href')}`)
}
