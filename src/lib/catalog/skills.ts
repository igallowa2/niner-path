/** Tags course text with skills from the keyword map in src/data/catalog/skill-keywords.ts. */
import { SKILL_KEYWORDS, type SkillDefinition } from '../../data/catalog/skill-keywords'

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** "statistic*" -> /\bstatistic\w*\b/i ; "supply and demand" -> /\bsupply\s+and\s+demand\b/i */
function keywordRegex(keyword: string): RegExp {
  const wildcard = keyword.endsWith('*')
  const body = escape(wildcard ? keyword.slice(0, -1) : keyword).replace(/\s+/g, '\\s+')
  return new RegExp(`\\b${body}${wildcard ? '\\w*' : ''}\\b`, 'i')
}

/** Skill names whose keywords appear in the text, in the map's order. */
export function tagSkills(text: string, map: SkillDefinition[] = SKILL_KEYWORDS): string[] {
  return map.filter((skill) => skill.keywords.some((k) => keywordRegex(k).test(text))).map((s) => s.name)
}

/** The O*NET element for a skill name (for linking to job skills). */
export function onetFor(name: string, map: SkillDefinition[] = SKILL_KEYWORDS): SkillDefinition['onet'] | undefined {
  return map.find((s) => s.name === name)?.onet
}
