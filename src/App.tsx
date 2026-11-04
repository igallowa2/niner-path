import { JobTracker } from './components/JobTracker'

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">N</span> Niner Path</div>
        <nav aria-label="Main">
          <p className="nav-group">Career</p>
          <a className="nav-item active" href="#" aria-current="page">Job Tracker</a>
        </nav>
      </aside>
      <main className="content">
        <JobTracker />
      </main>
    </div>
  )
}
