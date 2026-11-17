import type { RequirementProgress } from './progress'

/** Short progress text for a requirement: "ECON 2101", "1 of 2 courses", "6 of 12 credits (3 in progress)" */
export function requirementDetail(r: RequirementProgress): string {
  const req = r.requirement
  const applied = r.applied.map((a) => `${a.code}${a.status === 'in-progress' ? ' (in progress)' : ''}`).join(', ')
  if (req.kind === 'course') {
    const options = [req.course, ...(req.alternatives ?? [])].join(' or ')
    return applied || options
  }
  const progress = `${r.have} of ${r.need} ${r.unit}${r.inProgress ? ` (${r.inProgress} in progress)` : ''}`
  return applied ? `${progress}: ${applied}` : progress
}
