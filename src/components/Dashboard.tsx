import { DegreeProgressCard } from './DegreeProgressCard'

export function Dashboard() {
  return (
    <section className="dashboard">
      <header className="tracker-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Keep track of your academic and career goals.</p>
        </div>
      </header>
      <DegreeProgressCard />
    </section>
  )
}
