import type { Application } from '../types'
import { sampleApplications } from './sampleData'

export const STORAGE_KEY = 'niner-path.applications'

/** Loads saved applications. Falls back to sample data if nothing is saved or the data is broken. */
export function loadApplications(): Application[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return sampleApplications
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : sampleApplications
  } catch {
    return sampleApplications
  }
}

/** Saves applications so they are still there after a page refresh. */
export function saveApplications(apps: Application[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  } catch {
    // Storage can be blocked (for example, in private browsing). The app still works for this visit.
  }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function newId(): string {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
