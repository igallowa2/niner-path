/**
 * Turns catalog prerequisite text into AND/OR rules.
 *
 * It only returns `parsed` when it is confident. Anything else (class standing, permission,
 * "or equivalent", mixed and/or without parentheses, a grade that applies to part of a list, …)
 * is returned as `needs-review` with the reasons, so a person can check it.
 */
import type { LetterGrade, ParseStatus, PrereqNode } from './types'

export interface ParseResult {
  node: PrereqNode | null
  status: ParseStatus
  reasons: string[]
}

const COURSE_RE = /\b([A-Z]{2,4})\s*(\d{4}[A-Z]?)\b/
const GRADE_RE = /\(?\s*(?:with\s+)?(?:an?\s+)?(?:minimum\s+)?(?:final\s+)?grades?\s+of\s+(?:at\s+least\s+)?(?:an?\s+)?["“']?([A-D])["”']?\s*(?:or\s+(?:above|better|higher))?(?:\s+in\s+(?:each|both|all|either))?\s*\)?/gi
const LABEL_RE = /^\s*(?:pre-?\s*or\s+co-?requisites?\s*(?:\(s\))?|prerequisites?\s*(?:\(s\))?|co-?requisites?\s*(?:\(s\))?)\s*:?\s*/i
/** Words that carry no meaning for the rule. */
const FILLER = new Set(['both', 'either', 'one', 'of', 'the', 'following', 'completion', 'successful', 'completed', 'courses', 'course', 'each'])
/** Conditions we can't check from a course list. */
const NON_COURSE: [RegExp, string][] = [
  [/\b(freshman|sophomore|junior|senior)\s+standing\b|\bstanding\b/i, 'class standing'],
  [/\bpermission\b|\bconsent\b|\bapproval\b/i, 'permission required'],
  [/\badmi(ssion|tted)\b|\bmajors?\b|\bminors?\b|\bdeclared\b|\benrolled\b/i, 'program admission or major'],
  [/\bGPA\b/i, 'GPA requirement'],
  [/\bequivalent\b/i, '"or equivalent"'],
  [/\bplacement\b|\bscore\b|\bexam\b|\btest\b/i, 'placement or test score'],
  [/\bcredit hours?\b|\bhours\b/i, 'credit-hour count'],
  [/\bor (higher|above)\b/i, '"or higher" course level'],
  [/\band\/or\b/i, '"and/or"'],
]

type Token =
  | { t: 'course'; code: string }
  | { t: 'and' | 'or' | 'comma' | '(' | ')' }
  | { t: 'word'; text: string }

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const re = new RegExp(`${COURSE_RE.source}|\\(|\\)|,|[A-Za-z][A-Za-z'/-]*`, 'g')
  for (const m of text.matchAll(re)) {
    const s = m[0]
    if (m[1] && m[2]) tokens.push({ t: 'course', code: `${m[1]} ${m[2]}` })
    else if (s === '(' || s === ')') tokens.push({ t: s })
    else if (s === ',') tokens.push({ t: 'comma' })
    else if (/^and$/i.test(s)) tokens.push({ t: 'and' })
    else if (/^or$/i.test(s)) tokens.push({ t: 'or' })
    else tokens.push({ t: 'word', text: s })
  }
  return tokens
}

class Ambiguous extends Error {}

/** Recursive descent over tokens. Throws Ambiguous when the structure isn't clear. */
function parseGroup(tokens: Token[], pos: { i: number }, minGrade: LetterGrade | undefined, concurrentOk: boolean): PrereqNode | null {
  const items: PrereqNode[] = []
  const ops = new Set<'and' | 'or'>()
  let commas = 0

  while (pos.i < tokens.length) {
    const tok = tokens[pos.i]
    if (tok.t === ')') break
    pos.i++
    if (tok.t === 'course') {
      const node: PrereqNode = { type: 'course', code: tok.code }
      if (minGrade) node.minGrade = minGrade
      if (concurrentOk) node.concurrentOk = true
      items.push(node)
    } else if (tok.t === '(') {
      const inner = parseGroup(tokens, pos, minGrade, concurrentOk)
      if (tokens[pos.i]?.t !== ')') throw new Ambiguous('unbalanced parentheses')
      pos.i++
      if (inner) items.push(inner)
    } else if (tok.t === 'and' || tok.t === 'or') {
      ops.add(tok.t)
    } else if (tok.t === 'comma') {
      commas++
    }
    // words were already checked by the caller
  }

  if (items.length === 0) return null
  if (items.length === 1) return items[0]
  if (ops.size > 1) throw new Ambiguous('mixes "and" and "or" without parentheses')
  if (ops.size === 0) {
    if (commas > 0) throw new Ambiguous('list without "and" or "or"')
    throw new Ambiguous('courses listed without "and" or "or"')
  }
  const type = ops.has('or') ? 'or' : 'and'
  // Flatten "A and (B and C)" into one list.
  return { type, items: items.flatMap((n) => (n.type === type ? n.items : [n])) }
}

function parseClause(clause: string, concurrentOk: boolean, reasons: string[]): PrereqNode | null {
  // Pull out "with a grade of C or above" and remember it.
  const grades = new Set<string>()
  let gradeScopeUnclear = false
  const withoutGrades = clause.replace(GRADE_RE, (match, grade: string, offset: number) => {
    grades.add(grade.toUpperCase())
    if (COURSE_RE.test(clause.slice(offset + match.length))) gradeScopeUnclear = true
    return ' '
  })
  if (grades.size > 1) reasons.push('different minimum grades in one clause')
  if (gradeScopeUnclear) reasons.push('minimum grade applies to only part of the list')
  const minGrade = grades.size === 1 ? ([...grades][0] as LetterGrade) : undefined

  for (const [re, reason] of NON_COURSE) if (re.test(withoutGrades)) reasons.push(reason)

  const tokens = tokenize(withoutGrades)
  const unknown = tokens.filter((t): t is { t: 'word'; text: string } => t.t === 'word' && !FILLER.has(t.text.toLowerCase()))
  if (unknown.length > 0 && !reasons.length) reasons.push(`unrecognized words: ${unknown.map((u) => u.text).slice(0, 5).join(' ')}`)

  try {
    const pos = { i: 0 }
    const node = parseGroup(tokens, pos, minGrade, concurrentOk)
    if (pos.i < tokens.length) throw new Ambiguous('unbalanced parentheses')
    return node
  } catch (err) {
    if (err instanceof Ambiguous) {
      reasons.push(err.message)
      return null
    }
    throw err
  }
}

/**
 * Parses prerequisite (or corequisite) text.
 * @param concurrentOk true for "pre- or corequisite" text (the course may be taken at the same time)
 */
export function parseRequisites(raw: string, concurrentOk = false): ParseResult {
  const text = raw.replace(LABEL_RE, '').replace(/\s+/g, ' ').trim()
  if (!text || /^(none|n\/a)\.?$/i.test(text)) return { node: null, status: 'none', reasons: [] }

  const reasons: string[] = []
  // Semicolons and sentences are separate requirements that must all be met.
  const clauses = text.split(/;|\.(?:\s+|$)/).map((c) => c.trim()).filter(Boolean)
  const nodes: PrereqNode[] = []
  let structureFailed = false
  for (const clause of clauses) {
    const before = reasons.length
    const node = parseClause(clause, concurrentOk, reasons)
    if (node) nodes.push(node)
    else if (reasons.length > before && COURSE_RE.test(clause)) structureFailed = true
  }

  const node: PrereqNode | null =
    structureFailed || nodes.length === 0 ? null : nodes.length === 1 ? nodes[0] : { type: 'and', items: nodes.flatMap((n) => (n.type === 'and' ? n.items : [n])) }

  if (!node && reasons.length === 0) reasons.push('no courses found')
  return { node, status: reasons.length ? 'needs-review' : 'parsed', reasons: [...new Set(reasons)] }
}

/** Every course code mentioned in a rule. */
export function coursesIn(node: PrereqNode | null): string[] {
  if (!node) return []
  return node.type === 'course' ? [node.code] : node.items.flatMap(coursesIn)
}
