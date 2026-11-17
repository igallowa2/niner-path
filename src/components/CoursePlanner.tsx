import { useState } from 'react'
import { useCompletedCourses } from '../lib/catalog/completedCourses'
import { termOfferings, useDegreeProgram } from '../lib/catalog/data'
import { getAvailableCourses } from '../lib/catalog/progress'
import { AdvisorNote, DegreeError, DegreeLoading } from './degree/DegreeParts'

/** Courses the student can take next: still needed, prerequisites met, optionally offered in a term. */
export function CoursePlanner() {
  const { data, retry } = useDegreeProgram()
  const { courses } = useCompletedCourses()
  const [term, setTerm] = useState('')

  const header = (
    <header className="tracker-header">
      <div>
        <h1>Course Planner</h1>
        <p className="muted">Courses you can take next{data.status === 'ready' ? ` for ${data.program.name}` : ''}.</p>
      </div>
    </header>
  )

  if (data.status !== 'ready') {
    return (
      <section className="degree-page">
        {header}
        <AdvisorNote />
        {data.status === 'loading' ? <DegreeLoading /> : <DegreeError message={data.message} onRetry={retry} />}
      </section>
    )
  }

  const available = getAvailableCourses(courses, data.program, termOfferings, data.catalog, term || undefined)
  const termInfo = termOfferings.find((t) => t.term === term)

  return (
    <section className="degree-page">
      {header}
      <AdvisorNote />

      <div className="planner-controls">
        <div className="field">
          <label htmlFor="planner-term">Term</label>
          <select id="planner-term" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="">Any term</option>
            {termOfferings.map((t) => <option key={t.term}>{t.term}</option>)}
          </select>
        </div>
        <p className="muted small" aria-live="polite">
          {available.length} {available.length === 1 ? 'course' : 'courses'} available
          {termInfo?.note ? ` · ${termInfo.note}` : ''}
        </p>
      </div>

      {courses.length === 0 && (
        <p className="muted">
          Add the courses you've taken on <a href="#/degree">My Degree</a> to see what you can take next.
        </p>
      )}

      {available.length === 0 ? (
        <div className="empty">
          <h2>No courses to show</h2>
          <p className="muted">Try "Any term", or add more of your completed courses on My Degree.</p>
        </div>
      ) : (
        <ul className="list planner-list">
          {available.map(({ code, course, forRequirements, prereqNeedsReview, offered }) => (
            <li className="card planner-card" key={code}>
              <div className="card-body">
                <p className="company">{code} · {course ? `${course.credits}${course.creditsMax > course.credits ? `–${course.creditsMax}` : ''} credits` : 'credits unknown'}</p>
                <h3 className="role">{course?.title ?? code}</h3>
                <p className="muted small">Counts toward: {forRequirements.join('; ')}</p>
                {course?.prerequisitesRaw ? (
                  <p className="muted small">Prerequisites: {course.prerequisitesRaw}</p>
                ) : (
                  <p className="muted small">Prerequisites not in the catalog data yet: check the catalog.</p>
                )}
                {course && course.skills.length > 0 && (
                  <ul className="skill-chips" aria-label={`Skills from ${code}`}>
                    {course.skills.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                )}
              </div>
              <div className="card-side">
                {offered && <span className="badge req-done">Offered {term}</span>}
                {prereqNeedsReview && <span className="badge req-review">Check prerequisites</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
