import type { ApplicationInput } from '../types'

export type FormErrors = Partial<Record<keyof ApplicationInput, string>>

/** Returns true if the text is a full http(s) web address. */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Checks the Add Application form.
 * Returns an object of error messages. An empty object means the form is valid.
 */
export function validateApplication(input: ApplicationInput): FormErrors {
  const errors: FormErrors = {}

  if (!input.company.trim()) errors.company = 'Company is required.'
  if (!input.role.trim()) errors.role = 'Role title is required.'

  if (input.postingUrl.trim() && !isValidUrl(input.postingUrl.trim())) {
    errors.postingUrl = 'Enter a full link that starts with http:// or https://'
  }

  if (input.deadline && Number.isNaN(Date.parse(input.deadline))) {
    errors.deadline = 'Enter a valid date.'
  }

  return errors
}
