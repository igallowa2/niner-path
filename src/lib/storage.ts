/**
 * Reads and saves job applications through our API server (server/app.ts), which stores them
 * in the database. That is why they are still there after the app restarts.
 * In development, Vite forwards /api requests to the API server (see vite.config.ts).
 */
import type { Application, ApplicationInput, Status } from '../types'
import { validateApplication, type FormErrors } from './validation'

const API = '/api/applications'

export const SERVER_DOWN_MESSAGE =
  "Can't reach the server. Make sure the API is running (npm run server) and try again."

/** Thrown when a request fails. fieldErrors is set when specific form fields are the problem. */
export class ApiRequestError extends Error {
  fieldErrors?: FormErrors

  constructor(message: string, fieldErrors?: FormErrors) {
    super(message)
    this.name = 'ApiRequestError'
    this.fieldErrors = fieldErrors
  }
}

/** Sends one request and returns the JSON reply. Turns every kind of failure into an ApiRequestError. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch {
    // fetch only throws when there is no reply at all (server off, no network).
    throw new ApiRequestError(SERVER_DOWN_MESSAGE)
  }

  if (res.status === 204) return undefined as T // success with no body (delete)

  const body: unknown = await res.json().catch(() => undefined)
  if (res.ok && body !== undefined) return body as T
  throw toApiError(res.status, body)
}

/** The server replies { errors: {field: message} } for bad input and { error: message } otherwise. */
function toApiError(status: number, body: unknown): ApiRequestError {
  const b = (body ?? {}) as { error?: unknown; errors?: unknown }
  if (b.errors && typeof b.errors === 'object') {
    const fieldErrors = b.errors as FormErrors
    return new ApiRequestError(Object.values(fieldErrors).join(' '), fieldErrors)
  }
  if (typeof b.error === 'string') return new ApiRequestError(b.error)
  // No readable JSON: usually the Vite proxy reporting that the API server is not running.
  if (body === undefined) return new ApiRequestError(SERVER_DOWN_MESSAGE)
  return new ApiRequestError(`The request failed (error ${status}). Please try again.`)
}

/** All saved applications, newest first. */
export async function loadApplications(): Promise<Application[]> {
  const list = await request<unknown>(API)
  if (!Array.isArray(list)) throw new ApiRequestError('The server sent data we could not read.')
  return list as Application[]
}

/** Saves a new application. Checks required fields first, so bad data is never sent. */
export async function appendApplication(input: ApplicationInput): Promise<Application> {
  const errors = validateApplication(input)
  if (Object.keys(errors).length > 0) {
    throw new ApiRequestError(Object.values(errors).join(' '), errors)
  }
  return request<Application>(API, { method: 'POST', body: JSON.stringify(input) })
}

/** Changes an application's status. The server adds the change to its timeline. */
export function updateApplicationStatus(id: string, status: Status): Promise<Application> {
  return request<Application>(`${API}/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/** Permanently deletes an application. */
export function deleteApplication(id: string): Promise<void> {
  return request<void>(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
