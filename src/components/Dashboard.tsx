import { useCompletedCourses } from '../lib/catalog/completedCourses'
import { useDegreeProgram } from '../lib/catalog/data'
import { getDegreeProgress } from '../lib/catalog/progress'
import { DegreeProgressCard } from './DegreeProgressCard'

export function Dashboard() {
  const { courses } = useCompletedCourses()
  const { data } = useDegreeProgram()
  // Real progress from the student's courses; the card keeps its own defaults until the catalog loads.
  const program = data.status === 'ready' ? data.program : undefined
  const progress = data.status === 'ready' ? getDegreeProgress(courses, data.program, data.catalog) : undefined

  return (
    <section className="dashboard">
      <header className="tracker-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Keep track of your academic and career goals.</p>
        </div>
      </header>
      {progress && program ? (
        <DegreeProgressCard completedCredits={progress.completedCredits} totalCredits={progress.totalCredits} catalogYear={program.catalogYear} />
      ) : (
        <DegreeProgressCard />
      )}
    </section>
  )
}
