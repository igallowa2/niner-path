/**
 * Development helper: fetches (or reads from cache) catalog pages and prints a summary
 * of their links and forms, to work out the catalog's page structure.
 * Run: npx tsx scripts/catalog/probe.ts "content.php?catoid=42&navoid=5403" ...
 */
import { JSDOM } from 'jsdom'
import { catalogUrl, getPage } from './http'

for (const path of process.argv.slice(2)) {
  const html = await getPage(catalogUrl(path))
  const doc = new JSDOM(html).window.document
  console.log(`\n===== ${path} =====`)

  for (const select of doc.querySelectorAll('select')) {
    const options = [...select.querySelectorAll('option')].slice(0, 6).map((o) => `${o.value}=${o.textContent?.trim()}`)
    console.log(`select name="${select.getAttribute('name')}": ${options.join(' | ')} ...`)
  }

  const links = [...doc.querySelectorAll<HTMLAnchorElement>('a[href]')]
  const interesting = links.filter((a) => /preview_program|preview_course|poid=|coid=|cpage=/.test(a.getAttribute('href') ?? ''))
  console.log(`links to programs/courses/pages: ${interesting.length}`)
  for (const a of interesting) {
    const text = a.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    if (/econom|business|belk|core/i.test(text) || /cpage=/.test(a.getAttribute('href') ?? '')) {
      console.log(`  ${text.slice(0, 90)}  ->  ${a.getAttribute('href')}`)
    }
  }
  console.log(`sample: ${interesting.slice(0, 3).map((a) => `${a.textContent?.trim().slice(0, 50)} -> ${a.getAttribute('href')}`).join('\n        ')}`)
}
