/**
 * The signed-in student's profile. This is the one place the app reads it from.
 * Onboarding (issue #11) isn't built yet, so these are Ivory's details for now;
 * when onboarding saves a real profile, replace `getProfile` and nothing else needs to change.
 */
export interface StudentProfile {
  firstName: string
  lastName: string
  major: string
  minor: string
  /** e.g. "May 2027" */
  graduation: string
  /** e.g. "Data Analyst" (shown as "Targeting Data Analyst roles") */
  targetRole: string
  /** A company the student saved recently, used by the "Because you saved…" quick link. */
  recentlySavedCompany: string
}

const PROFILE: StudentProfile = {
  firstName: 'Ivory',
  lastName: 'Galloway',
  major: 'Economics',
  minor: 'Software Development',
  graduation: 'May 2027',
  targetRole: 'Data Analyst',
  recentlySavedCompany: 'Goldman Sachs',
}

export function getProfile(): StudentProfile {
  return PROFILE
}

/** "IG" */
export function profileInitials(p: StudentProfile): string {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()
}

/** "Economics · Software Development minor · Graduating May 2027 · Targeting Data Analyst roles" */
export function profileSummary(p: StudentProfile): string {
  return [
    p.major,
    p.minor && `${p.minor} minor`,
    p.graduation && `Graduating ${p.graduation}`,
    p.targetRole && `Targeting ${p.targetRole} roles`,
  ].filter(Boolean).join(' · ')
}
