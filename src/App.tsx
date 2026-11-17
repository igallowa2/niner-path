import { Fragment, useEffect, useState } from 'react'
import { CareerExplorer } from './components/CareerExplorer'
import { Dashboard } from './components/Dashboard'
import { JobSearch } from './components/JobSearch'
import { JobTracker } from './components/JobTracker'
import { MyDegree } from './components/MyDegree'
import { toJobKeyword } from './lib/jobs'

const NAV = [
  { group: 'Overview', items: [{ hash: '#/dashboard', label: 'Dashboard' }] },
  { group: 'Academics', items: [{ hash: '#/degree', label: 'My Degree' }] },
  {
    group: 'Career',
    items: [
      { hash: '#/jobs', label: 'Job Tracker' },
      { hash: '#/find-jobs', label: 'Find Jobs' },
      { hash: '#/careers', label: 'Explore Careers' },
    ],
  },
]

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#/dashboard')
  // A career picked on Explore Careers. `n` changes on every pick so Find Jobs starts a fresh search.
  const [jobSearch, setJobSearch] = useState({ what: '', auto: false, n: 0 })

  useEffect(() => {
    function handleHashChange() {
      setRoute(window.location.hash || '#/dashboard')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function findJobsFor(careerTitle: string) {
    setJobSearch((s) => ({ what: toJobKeyword(careerTitle), auto: true, n: s.n + 1 }))
    window.location.hash = '#/find-jobs'
  }

  let page
  if (route === '#/degree') page = <MyDegree />
  else if (route === '#/jobs') page = <JobTracker />
  else if (route === '#/find-jobs') page = <JobSearch key={jobSearch.n} initialWhat={jobSearch.what} autoSearch={jobSearch.auto} />
  else if (route === '#/careers') page = <CareerExplorer onFindJobs={findJobsFor} />
  else page = <Dashboard />

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span> Niner Path</div>
        <nav aria-label="Main">
          {NAV.map(({ group, items }) => (
            <Fragment key={group}>
              <p className="nav-group">{group}</p>
              {items.map(({ hash, label }) => (
                <a
                  key={hash}
                  className={`nav-item${route === hash ? ' active' : ''}`}
                  href={hash}
                  aria-current={route === hash ? 'page' : undefined}
                >
                  {label}
                </a>
              ))}
            </Fragment>
          ))}
        </nav>
      </aside>
      <main className="content">
        {page}
      </main>
    </div>
  )
}
