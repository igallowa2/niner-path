// Reads UNC Charlotte catalog pages (Acalog) and turns them into plain data.
// Every function takes a parsed HTML Document, so the same code works in Node (jsdom)
// and in a browser (DOMParser). Used by scripts/catalog/importCatalog.ts.

const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
}
const toNumber = (word) => (/^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word.toLowerCase()] ?? null)

// Sections on a program page that describe policies, not courses to take.
const NON_REQUIREMENT_HEADINGS =
  /admission|progression|cooperative education|experiential|honors program|advising|transfer|academic plan|degree total|additional degree requirements|program (overview|information)|contact|financial|accreditation|learning outcomes|grade requirement/i

/** Program links on the "Academic Programs" A-Z page. */
export function parseProgramList(doc) {
  const seen = new Set()
  const programs = []
  for (const a of doc.querySelectorAll('a')) {
    const poid = (a.getAttribute('href') || '').match(/preview_program\.php\?.*poid=(\d+)/)?.[1]
    const name = clean(a.textContent)
    if (!poid || !name || seen.has(poid)) continue
    seen.add(poid)
    programs.push({ catalogId: Number(poid), name })
  }
  return programs
}

/** College pages linked from the "COLLEGES/UNITS" menu. */
export function parseCollegeLinks(doc) {
  const colleges = []
  for (const a of doc.querySelectorAll('a')) {
    const poid = (a.getAttribute('href') || '').match(/preview_program\.php\?.*poid=(\d+)/)?.[1]
    const name = clean(a.textContent)
    if (poid && /^(College of|Office of Undergraduate Education)/i.test(name)) {
      colleges.push({ catalogId: Number(poid), name })
    }
  }
  return colleges
}

/** Every program a college page links to. */
export function parseCollegePage(doc) {
  const content = doc.querySelector('td.block_content') || doc.body
  const ids = new Set()
  for (const a of content.querySelectorAll('a')) {
    const poid = (a.getAttribute('href') || '').match(/preview_program\.php\?.*poid=(\d+)/)?.[1]
    if (poid) ids.add(Number(poid))
  }
  return [...ids]
}

/** Major, Minor, Certificate, Honors, Early Entry, or Other, based on the program name. */
export function programType(name) {
  if (/early entry/i.test(name)) return 'Early Entry'
  if (/\bminor\b/i.test(name)) return 'Minor'
  if (/certificate/i.test(name)) return 'Certificate'
  if (/honors/i.test(name)) return 'Honors'
  if (/,\s*(B\.[A-Z.]+|A\.[A-Z.]+)\s*$/.test(name) || /\bB\.[A-Z]\.?/.test(name)) return 'Major'
  return 'Other'
}

/** "B.S." from "Computer Science, Data Science Concentration, B.S." */
export function degreeOf(name) {
  return name.match(/,\s*([A-Z]\.[A-Z.]+)\s*$/)?.[1] ?? ''
}

/** "31-32" -> {min: 31, max: 32}; "3" -> {min: 3, max: 3}; "1 to 3" -> {min: 1, max: 3}. */
export function parseCredits(text) {
  const nums = (clean(text).match(/\d+(\.\d+)?/g) || []).map(Number)
  if (nums.length === 0) return { min: null, max: null }
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

/**
 * Turns the instructions under a heading into a rule.
 * "Select one of the following:" -> CHOOSE 1 course
 * "Select 15 elective credit hours" -> CHOOSE 15 credit hours
 */
export function parseRule(text) {
  const t = clean(text)
  const n = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen)'
  const creditRule = t.match(new RegExp(`(?:select|choose|complete|take)\\s+(?:a minimum of\\s+|at least\\s+|an additional\\s+)?${n}\\s+(?:additional\\s+)?(?:elective\\s+)?credit\\s+hours?`, 'i'))
  if (creditRule) return { rule: 'CHOOSE', chooseCount: null, chooseCredits: toNumber(creditRule[1]) }
  const courseRule = t.match(new RegExp(`(?:select|choose|complete|take)\\s+(?:any\\s+|at least\\s+)?${n}\\b`, 'i'))
  if (courseRule) return { rule: 'CHOOSE', chooseCount: toNumber(courseRule[1]), chooseCredits: null }
  if (/^(select|choose)\b/i.test(t) || /select (from|among)/i.test(t)) return { rule: 'CHOOSE', chooseCount: null, chooseCredits: null }
  return { rule: 'ALL', chooseCount: null, chooseCredits: null }
}

const COURSE_LINE = /^(or\s+|and\s+)?([A-Z]{2,5})\s+(\d{4}[A-Z]{0,2})\s+-\s+(.+?)(?:\s*\(([^()]*\d[^()]*)\))?\s*(\(.*\))?$/

/** One course line on a program page, e.g. "or MATH 2165 - Introduction to Discrete Structures (3)". */
export function parseCourseLine(text) {
  const m = clean(text).match(COURSE_LINE)
  if (!m) return null
  const credits = parseCredits(m[5] || '')
  return {
    isAlternative: /^or/i.test(m[1] || ''),
    prefix: m[2],
    number: m[3],
    code: `${m[2]} ${m[3]}`,
    title: clean(m[4]),
    creditsText: clean(m[5] || ''),
    minCredits: credits.min,
    maxCredits: credits.max,
    note: clean(m[6] || '').replace(/^\(|\)$/g, ''),
  }
}

/** Course id inside the link's onclick, e.g. showCourse('42', '147954', ...). */
function courseCatalogId(li) {
  const a = li.querySelector('a')
  const onclick = a?.getAttribute('onclick') || ''
  const href = a?.getAttribute('href') || ''
  const id = onclick.match(/showCourse\(\s*'\d+'\s*,\s*'(\d+)'/)?.[1] || href.match(/coid=(\d+)/)?.[1]
  return id ? Number(id) : null
}

/** A full program page: requirement groups (with nesting) and the courses in each. */
export function parseProgramPage(doc) {
  const name = clean(doc.querySelector('#acalog-content')?.textContent || doc.querySelector('h1')?.textContent)
  const groups = []
  const stack = [] // [{level, index}] of open headings, used to find each group's parent
  let totalCredits = null

  for (const core of doc.querySelectorAll('.acalog-core')) {
    const heading = core.querySelector('h2, h3, h4, h5, h6')
    if (!heading) continue
    const level = Number(heading.tagName.slice(1))
    const label = clean(heading.textContent)

    const total = label.match(/total\D*(\d+)\s*credit/i)
    if (total) totalCredits = Number(total[1])

    while (stack.length && stack[stack.length - 1].level >= level) stack.pop()

    const courseItems = [...core.querySelectorAll('li.acalog-course')]
    const skip = NON_REQUIREMENT_HEADINGS.test(label) && courseItems.length === 0
    if (skip) {
      stack.push({ level, index: null, skip: true })
      continue
    }
    // Anything nested under a skipped section (e.g. Admission Requirements > ...) is skipped too.
    if (stack.some((s) => s.skip)) continue

    const notes = clean([...core.querySelectorAll('p')].map((p) => p.textContent).join(' '))
    const courses = []
    let slot = 0
    for (const li of courseItems) {
      const course = parseCourseLine(li.textContent)
      if (!course) continue
      if (!course.isAlternative || courses.length === 0) slot += 1
      courses.push({ ...course, catalogId: courseCatalogId(li), slot })
    }
    const otherItems = [...core.querySelectorAll('li:not(.acalog-course)')].map((li) => clean(li.textContent)).filter(Boolean)
    const fullNotes = clean([notes, ...otherItems].join(' '))

    const parent = [...stack].reverse().find((s) => s.index !== null)
    const credits = parseCredits(label.match(/\(([^()]*credit[^()]*)\)/i)?.[1] || '')
    const rule = parseRule(notes)

    groups.push({
      label: label.replace(/\s*\([^()]*credit[^()]*\)\s*$/i, ''),
      level,
      parentIndex: parent ? parent.index : null,
      minCredits: credits.min,
      maxCredits: credits.max,
      rule: rule.rule,
      chooseCount: rule.chooseCount,
      chooseCredits: rule.chooseCredits,
      notes: fullNotes,
      courses,
    })
    stack.push({ level, index: groups.length - 1 })
  }

  // A group with no listed courses and no sub-groups is "OPEN": the student picks any
  // courses that match the notes (e.g. "15 credit hours outside ITSC, ITCS, or ITIS").
  const hasChildren = new Set(groups.map((g) => g.parentIndex).filter((i) => i !== null))
  groups.forEach((g, i) => {
    if (g.courses.length === 0 && !hasChildren.has(i) && g.notes) g.rule = 'OPEN'
  })
  // Drop empty leaf headings (no courses, no notes, no sub-groups), then fix parent indexes.
  const keep = groups.map((g, i) => g.courses.length > 0 || g.notes !== '' || hasChildren.has(i))
  const newIndex = []
  let next = 0
  keep.forEach((k, i) => (newIndex[i] = k ? next++ : null))
  const kept = groups
    .filter((_, i) => keep[i])
    .map((g) => ({ ...g, parentIndex: g.parentIndex === null ? null : newIndex[g.parentIndex] }))

  return { name, type: programType(name), degree: degreeOf(name), totalCredits, groups: kept }
}

/** A course page: description, credits, prerequisites, corequisites, restrictions. */
export function parseCoursePage(doc) {
  const content = doc.querySelector('td.block_content') || doc.body
  const h1 = content.querySelector('h1')
  const heading = clean(h1?.textContent)
  const m = heading.match(/^([A-Z]{2,5})\s+(\d{4}[A-Z]{0,2})\s+-\s+(.+)$/)
  const text = clean(content.textContent)
  const start = heading ? text.indexOf(heading) + heading.length : 0
  const body = text.slice(start)

  const LABELS = ['Credit Hours', 'Restriction\\(s\\)', 'Prerequisite\\(s\\)', 'Corequisite\\(s\\)', 'Pre- or Corequisite\\(s\\)', 'Cross-listed', 'Cross Listed', 'Grading Basis', 'Repeatable', 'Note', 'Schedule of Classes', 'Back to Top']
  const labelRe = new RegExp(`(${LABELS.join('|')}):?`, 'g')
  const parts = {}
  const firstLabel = body.search(labelRe)
  const description = clean(firstLabel >= 0 ? body.slice(0, firstLabel) : body)
  const matches = [...body.matchAll(labelRe)]
  matches.forEach((match, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length
    const key = match[1].replace(/\\/g, '')
    parts[key] = clean(body.slice(match.index + match[0].length, end))
  })
  const credits = parseCredits(parts['Credit Hours'] || '')
  return {
    code: m ? `${m[1]} ${m[2]}` : '',
    title: m ? clean(m[3]) : heading,
    description,
    creditsText: clean((parts['Credit Hours'] || '').replace(/[()]/g, '')),
    minCredits: credits.min,
    maxCredits: credits.max,
    prerequisites: parts['Prerequisite(s)'] || parts['Pre- or Corequisite(s)'] || '',
    corequisites: parts['Corequisite(s)'] || '',
    restrictions: parts['Restriction(s)'] || '',
  }
}
