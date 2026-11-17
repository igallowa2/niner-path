import type { RequirementStatus } from '../../lib/catalog/progress'

export const ADVISOR_NOTE = 'Unofficial planning tool. Confirm your progress with your advisor and DegreeWorks.'

export function AdvisorNote() {
  return <p className="degree-note" role="note">{ADVISOR_NOTE}</p>
}

const STATUS_LABEL: Record<RequirementStatus, string> = { done: 'Done', 'in-progress': 'In progress', needed: 'Needed' }

export function StatusBadge({ status }: { status: RequirementStatus }) {
  return <span className={`badge req-${status}`}>{STATUS_LABEL[status]}</span>
}
