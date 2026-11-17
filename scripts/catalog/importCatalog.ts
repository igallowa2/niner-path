// Adds programs from the official UNC Charlotte undergraduate catalog to prisma/catalog.json.
//
//   npm run catalog:import -- --only "Economics"            (programs whose name starts with "Economics")
//   npm run catalog:import -- --only "Economics" --with-course-details
//
// Be gentle with the catalog site: robots.txt asks for 120 seconds between requests, and it has
// bot protection. All downloads go through ./http.ts, which waits 120 seconds between pages (even
// across runs), saves every page in scripts/catalog/.cache/ (so nothing is downloaded twice), skips
// paths robots.txt disallows, and stops right away if the site starts blocking.
// Import a few programs at a time. Programs already in catalog.json are kept.
// After it finishes, run `npm run db:seed` to load the data into your database.
// Each new school year: update CATALOG below (see docs/catalog-import.md).

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import { catalogUrl, getPage as getCachedPage } from './http'
import {
  parseCollegeLinks,
  parseCollegePage,
  parseCoursePage,
  parseProgramList,
  parseProgramPage,
} from './parse.js'

export const CATALOG = {
  baseUrl: 'https://catalog.charlotte.edu',
  catalogId: 42, // "catoid" for the 2026-2027 Undergraduate Catalog
  catalogYear: '2026-2027',
  programsNavId: 5403, // "Academic Programs" page
  collegesNavId: 5415, // "COLLEGES/UNITS" page
}

// Short codes match the tabs in the "Catalog Widget API - Undergraduate" sheet.
export const COLLEGE_CODES: Record<string, string> = {
  'College of Arts + Architecture': 'COAA',
  'College of Business': 'BCOB',
  'College of Computing and Informatics': 'CCI',
  'College of Education': 'COED',
  'College of Engineering': 'COENG',
  'College of Health and Human Services': 'CHHS',
  'College of Humanities & Earth and Social Sciences': 'CHESS',
  'College of Science': 'COS',
  'Office of Undergraduate Education (includes University College)': 'UCOL',
}

const OUTPUT = path.resolve('prisma/catalog.json')

/** Reads a catalog page (cached, 120 s between downloads, stops if the site blocks us). */
async function getPage(relativeUrl: string): Promise<Document> {
  return new JSDOM(await getCachedPage(catalogUrl(relativeUrl))).window.document
}

type CatalogJson = {
  colleges: { code: string; name: string; catalogId: number | null }[]
  courses: Record<string, unknown>[]
  programs: { catalogId: number; [key: string]: unknown }[]
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const programUrl = (poid: number) => `/preview_program.php?catoid=${CATALOG.catalogId}&poid=${poid}`
const courseUrl = (coid: number) => `/preview_course_nopop.php?catoid=${CATALOG.catalogId}&coid=${coid}`

async function main() {
  const only = argValue('--only')
  const withCourseDetails = process.argv.includes('--with-course-details')
  if (!only) {
    console.error('Pick which programs to import, e.g.  npm run catalog:import -- --only "Economics"')
    process.exitCode = 1
    return
  }
  const existing: CatalogJson = existsSync(OUTPUT)
    ? JSON.parse(await readFile(OUTPUT, 'utf8'))
    : { colleges: [], courses: [], programs: [] }

  // 1. Colleges, and which programs each one lists.
  const collegesPage = await getPage(`/content.php?catoid=${CATALOG.catalogId}&navoid=${CATALOG.collegesNavId}`)
  const colleges = []
  const collegeOfProgram = new Map<number, string>()
  for (const college of parseCollegeLinks(collegesPage)) {
    const code = COLLEGE_CODES[college.name]
    if (!code) {
      console.warn(`  Unknown college "${college.name}". Add it to COLLEGE_CODES. Skipping.`)
      continue
    }
    colleges.push({ code, name: college.name, catalogId: college.catalogId })
    for (const poid of parseCollegePage(await getPage(programUrl(college.catalogId)))) {
      if (!collegeOfProgram.has(poid)) collegeOfProgram.set(poid, code)
    }
  }
  console.log(`Found ${colleges.length} colleges.`)

  // 2. Every program in the A-Z list.
  const allPrograms = parseProgramList(await getPage(`/content.php?catoid=${CATALOG.catalogId}&navoid=${CATALOG.programsNavId}`))
  const list = allPrograms.filter((p) => p.name.toLowerCase().startsWith(only.toLowerCase()))
  console.log(`${list.length} of ${allPrograms.length} programs start with "${only}". Reading each one...`)

  const programs = []
  const courses = new Map<string, Record<string, unknown>>(existing.courses.map((c) => [String(c.code), c]))
  for (const [i, item] of list.entries()) {
    const parsed = parseProgramPage(await getPage(programUrl(item.catalogId)))
    programs.push({
      catalogId: item.catalogId,
      name: parsed.name || item.name,
      type: parsed.type,
      degree: parsed.degree,
      totalCredits: parsed.totalCredits,
      catalogUrl: CATALOG.baseUrl + programUrl(item.catalogId),
      collegeCode: collegeOfProgram.get(item.catalogId) ?? null,
      groups: parsed.groups.map((g) => ({
        ...g,
        courses: g.courses.map((c) => ({ code: c.code, slot: c.slot, note: c.note })),
      })),
    })
    for (const group of parsed.groups) {
      for (const c of group.courses) {
        if (courses.has(c.code)) continue
        courses.set(c.code, {
          code: c.code,
          catalogId: c.catalogId,
          prefix: c.prefix,
          number: c.number,
          title: c.title,
          minCredits: c.minCredits,
          maxCredits: c.maxCredits,
          creditsText: c.creditsText,
          description: '',
          prerequisites: '',
          corequisites: '',
          restrictions: '',
        })
      }
    }
    console.log(`  ${i + 1}/${list.length}  ${item.name}`)
  }

  // 3. Course details (description, prerequisites, ...) for this run's courses that don't have them yet.
  if (withCourseDetails) {
    const codes = new Set(programs.flatMap((p) => p.groups.flatMap((g) => g.courses.map((c) => c.code))))
    const todo = [...courses.values()].filter((c) => codes.has(String(c.code)) && !c.description && c.catalogId)
    console.log(`Reading details for ${todo.length} courses...`)
    let done = 0
    for (const course of todo) {
      const details = parseCoursePage(await getPage(courseUrl(course.catalogId as number)))
      Object.assign(course, {
        description: details.description,
        prerequisites: details.prerequisites,
        corequisites: details.corequisites,
        restrictions: details.restrictions,
        ...(details.minCredits !== null && { minCredits: details.minCredits, maxCredits: details.maxCredits, creditsText: details.creditsText }),
      })
      if (++done % 10 === 0) console.log(`  ${done}/${todo.length} courses`)
    }
  }

  // Keep programs from earlier runs; replace the ones imported this time.
  const imported = new Set(programs.map((p) => p.catalogId))
  const allSaved = [...existing.programs.filter((p) => !imported.has(p.catalogId)), ...programs]
  const output = {
    source: CATALOG.baseUrl,
    catalogYear: CATALOG.catalogYear,
    importedAt: new Date().toISOString(),
    colleges,
    courses: [...courses.values()].sort((a, b) => String(a.code).localeCompare(String(b.code))),
    programs: allSaved.sort((a, b) => String(a.name).localeCompare(String(b.name))),
  }
  await writeFile(OUTPUT, JSON.stringify(output, null, 1))
  console.log(`Imported ${programs.length} programs. prisma/catalog.json now has ${allSaved.length} programs and ${courses.size} courses.`)
  console.log('Next: npm run db:seed')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
