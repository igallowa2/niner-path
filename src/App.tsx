import { useEffect, useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { JobTracker } from './components/JobTracker'
import { MyDegree } from './components/MyDegree'

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#/dashboard')

  useEffect(() => {
    function handleHashChange() {
      setRoute(window.location.hash || '#/dashboard')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const page = route === '#/degree' ? <MyDegree /> : route === '#/jobs' ? <JobTracker /> : <Dashboard />

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span> Niner Path</div>
        <nav aria-label="Main">
          <p className="nav-group">Overview</p>
          <a className={`nav-item${route === '#/dashboard' ? ' active' : ''}`} href="#/dashboard" aria-current={route === '#/dashboard' ? 'page' : undefined}>Dashboard</a>
          <p className="nav-group">Academics</p>
          <a className={`nav-item${route === '#/degree' ? ' active' : ''}`} href="#/degree" aria-current={route === '#/degree' ? 'page' : undefined}>My Degree</a>
          <p className="nav-group">Career</p>
          <a className={`nav-item${route === '#/jobs' ? ' active' : ''}`} href="#/jobs" aria-current={route === '#/jobs' ? 'page' : undefined}>Job Tracker</a>
        </nav>
      </aside>
      <main className="content">
        {page}
      </main>
    </div>
  )
}
