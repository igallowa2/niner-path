const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

function dateOnlyToUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Returns the number of calendar days between an applied date and today. */
export function daysSinceApplying(appliedDate: string, now = new Date()): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.floor((today - dateOnlyToUtc(appliedDate)) / MILLISECONDS_PER_DAY)
}
