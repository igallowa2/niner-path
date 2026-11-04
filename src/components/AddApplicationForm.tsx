import { useState, type FormEvent } from 'react'
import { JOB_TYPES, STATUSES, type ApplicationInput, type JobType, type Status } from '../types'
import { validateApplication, type FormErrors } from '../lib/validation'

const EMPTY: ApplicationInput = {
  company: '',
  role: '',
  location: '',
  jobType: 'Internship',
  industry: '',
  deadline: '',
  status: 'Saved',
  postingUrl: '',
}

interface Props {
  onSave: (input: ApplicationInput) => void
  onCancel: () => void
}

export function AddApplicationForm({ onSave, onCancel }: Props) {
  const [values, setValues] = useState<ApplicationInput>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})

  function update<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    // Clear a field's error as soon as the user edits it.
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found = validateApplication(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSave({
      ...values,
      company: values.company.trim(),
      role: values.role.trim(),
      location: values.location.trim(),
      industry: values.industry.trim(),
      postingUrl: values.postingUrl.trim(),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-app-title"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        noValidate
      >
        <h2 id="add-app-title">Add application</h2>
        <p className="muted">Track a job you're interested in or have applied to.</p>

        <Field label="Company *" id="company" error={errors.company}>
          <input id="company" value={values.company} onChange={(e) => update('company', e.target.value)} placeholder="e.g. Capital One" autoFocus />
        </Field>

        <Field label="Role title *" id="role" error={errors.role}>
          <input id="role" value={values.role} onChange={(e) => update('role', e.target.value)} placeholder="e.g. Data Analytics Intern" />
        </Field>

        <div className="row">
          <Field label="Location" id="location">
            <input id="location" value={values.location} onChange={(e) => update('location', e.target.value)} placeholder="City, State" />
          </Field>
          <Field label="Industry" id="industry">
            <input id="industry" value={values.industry} onChange={(e) => update('industry', e.target.value)} placeholder="e.g. Finance" />
          </Field>
        </div>

        <div className="row">
          <Field label="Job type" id="jobType">
            <select id="jobType" value={values.jobType} onChange={(e) => update('jobType', e.target.value as JobType)}>
              {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status" id="status">
            <select id="status" value={values.status} onChange={(e) => update('status', e.target.value as Status)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div className="row">
          <Field label="Apply by" id="deadline" error={errors.deadline}>
            <input id="deadline" type="date" value={values.deadline} onChange={(e) => update('deadline', e.target.value)} />
          </Field>
          <Field label="Posting link" id="postingUrl" error={errors.postingUrl}>
            <input id="postingUrl" value={values.postingUrl} onChange={(e) => update('postingUrl', e.target.value)} placeholder="https://..." />
          </Field>
        </div>

        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn primary">Save application</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
