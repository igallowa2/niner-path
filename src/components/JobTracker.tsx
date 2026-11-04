import { useEffect, useState } from 'react'
import type { Application, ApplicationInput, Status } from '../types'
import { loadApplications, newId, saveApplications, today } from '../lib/storage'
import { AddApplicationForm } from './AddApplicationForm'
import { ApplicationCard } from './ApplicationCard'

export function JobTracker() {
  const [apps, setApps] = useState<Application[]>(() => loadApplications())
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState('')

  // Save every change so the list is still there after a refresh.
  useEffect(() => saveApplications(apps), [apps])

  function addApplication(input: ApplicationInput) {
    const app: Application = { ...input, id: newId(), timeline: [{ status: input.status, date: today() }] }
    setApps((list) => [app, ...list])
    setShowForm(false)
    setMessage(`Added ${app.role} at ${app.company}.`)
  }

  function changeStatus(id: string, status: Status) {
    setApps((list) =>
      list.map((a) =>
        a.id === id && a.status !== status
          ? { ...a, status, timeline: [...a.timeline, { status, date: today() }] }
          : a,
      ),
    )
  }

  return (
    <section className="tracker">
      <header className="tracker-header">
        <div>
          <h1>Job Tracker</h1>
          <p className="muted">My Applications <span className="count" data-testid="app-count">{apps.length}</span></p>
        </div>
        <button className="btn primary" onClick={() => { setMessage(''); setShowForm(true) }}>+ Add application</button>
      </header>

      {message && <p className="toast" role="status">{message}</p>}

      {apps.length === 0 ? (
        <div className="empty">
          <h2>No applications yet</h2>
          <p className="muted">Add your first job to start tracking your search.</p>
          <button className="btn primary" onClick={() => setShowForm(true)}>+ Add application</button>
        </div>
      ) : (
        <div className="list">
          {apps.map((a) => <ApplicationCard key={a.id} app={a} onStatusChange={changeStatus} />)}
        </div>
      )}

      {showForm && <AddApplicationForm onSave={addApplication} onCancel={() => setShowForm(false)} />}
    </section>
  )
}
