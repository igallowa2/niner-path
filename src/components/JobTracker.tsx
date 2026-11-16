import { useEffect, useState } from 'react'
import type { Application, ApplicationInput, Status } from '../types'
import { appendApplication, deleteApplication, loadApplications, updateApplicationStatus } from '../lib/storage'
import { AddApplicationForm } from './AddApplicationForm'
import { ApplicationCard } from './ApplicationCard'

type Notice = { kind: 'success' | 'error'; text: string } | null

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

export function JobTracker() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // bump to load again ("Try again")
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  // Load the list from the database when the page opens (and on "Try again").
  useEffect(() => {
    let ignore = false // skip updates if the page closed before the reply arrived
    loadApplications()
      .then((list) => { if (!ignore) setApps(list) })
      .catch((err) => { if (!ignore) setLoadError(errorText(err)) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [reloadKey])

  // If saving fails, this throws and the form stays open to show the error.
  async function addApplication(input: ApplicationInput) {
    const app = await appendApplication(input)
    setApps((list) => [app, ...list])
    setShowForm(false)
    setNotice({ kind: 'success', text: `Added ${app.role} at ${app.company}.` })
  }

  async function changeStatus(id: string, status: Status) {
    setNotice(null)
    try {
      const updated = await updateApplicationStatus(id, status)
      setApps((list) => list.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      setNotice({ kind: 'error', text: `Couldn't update the status. ${errorText(err)}` })
    }
  }

  async function removeApplication(app: Application) {
    if (!window.confirm(`Delete ${app.role} at ${app.company}? This can't be undone.`)) return
    setNotice(null)
    try {
      await deleteApplication(app.id)
      setApps((list) => list.filter((a) => a.id !== app.id))
      setNotice({ kind: 'success', text: `Deleted ${app.role} at ${app.company}.` })
    } catch (err) {
      setNotice({ kind: 'error', text: `Couldn't delete the application. ${errorText(err)}` })
    }
  }

  function retryLoad() {
    setLoading(true)
    setLoadError('')
    setReloadKey((k) => k + 1)
  }

  function openForm() {
    setNotice(null)
    setShowForm(true)
  }

  return (
    <section className="tracker">
      <header className="tracker-header">
        <div>
          <h1>Job Tracker</h1>
          <p className="muted">My Applications <span className="count" data-testid="app-count">{apps.length}</span></p>
        </div>
        <button className="btn primary" onClick={openForm}>+ Add application</button>
      </header>

      {notice && (
        <p className={`toast${notice.kind === 'error' ? ' toast-error' : ''}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}

      {loading ? (
        <p className="muted" role="status">Loading your applications…</p>
      ) : loadError ? (
        <div className="empty" role="alert">
          <h2>Couldn't load your applications</h2>
          <p className="muted">{loadError}</p>
          <button className="btn primary" onClick={retryLoad}>Try again</button>
        </div>
      ) : apps.length === 0 ? (
        <div className="empty">
          <h2>No applications yet</h2>
          <p className="muted">Add your first job to start tracking your search.</p>
          <button className="btn primary" onClick={openForm}>+ Add application</button>
        </div>
      ) : (
        <div className="list">
          {apps.map((a) => (
            <ApplicationCard key={a.id} app={a} onStatusChange={changeStatus} onDelete={removeApplication} />
          ))}
        </div>
      )}

      {showForm && <AddApplicationForm onSave={addApplication} onCancel={() => setShowForm(false)} />}
    </section>
  )
}
