import { useCompletedCourses } from '../lib/catalog/completedCourses'
import { catalog, DEFAULT_PROGRAM_ID, getProgram } from '../lib/catalog/data'
import { getDegreeProgress } from '../lib/catalog/progress'
import { DegreeProgressCard } from './DegreeProgressCard'

export function Dashboard() {
  const { courses } = useCompletedCourses()
  const program = getProgram(DEFAULT_PROGRAM_ID)
  // Real progress from the student's courses; the card keeps its own defaults if there's no catalog data yet.
  const progress = program ? getDegreeProgress(courses, program, catalog) : undefined

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
