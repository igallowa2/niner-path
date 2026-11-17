import { useCompletedCourses, GRADE_OPTIONS } from '../lib/catalog/completedCourses'
import { catalog as defaultCatalog, DEFAULT_PROGRAM_ID, getProgram } from '../lib/catalog/data'
import { getDegreeProgress, type CourseIndex } from '../lib/catalog/progress'
import type { LetterGrade, Program } from '../lib/catalog/types'
import { CoursePicker } from './degree/CoursePicker'
import { requirementDetail } from '../lib/catalog/display'
import { AdvisorNote, StatusBadge } from './degree/DegreeParts'

interface Props {
  /** Defaults to the student's program and the generated catalog data; tests pass their own. */
  program?: Program
  catalog?: CourseIndex
}

export function MyDegree({ program = getProgram(DEFAULT_PROGRAM_ID), catalog = defaultCatalog }: Props) {
  const { courses, add, update, remove } = useCompletedCourses()

  if (!program) {
    return (
      <section className="degree-page">
        <header className="tracker-header">
          <div>
            <h1>My Degree</h1>
            <p className="muted">Your degree requirements and academic progress.</p>
          </div>
        </header>
        <AdvisorNote />
        <div className="empty">
          <h2>Catalog data isn't loaded yet</h2>
          <p className="muted">Run the catalog script (see scripts/catalog/README.md) to add your program's requirements.</p>
        </div>
      </section>
    )
  }

  const progress = getDegreeProgress(courses, program, catalog)
  const title = (code: string) => catalog[code]?.title ?? ''

  return (
    <section className="degree-page">
      <header className="tracker-header">
        <div>
          <h1>My Degree</h1>
          <p className="muted">{program.name} · {program.catalogYear} catalog</p>
        </div>
      </header>
      <AdvisorNote />

      <article className="degree-card degree-summary" aria-labelledby="degree-summary-title">
        <div className="degree-card-header">
          <div>
            <p className="eyebrow">Academic progress</p>
            <h2 id="degree-summary-title">Degree progress</h2>
          </div>
          <span className="degree-percent">{progress.percent}%</span>
        </div>
        <div className="degree-progress-summary">
          <strong>{progress.completedCredits} <span>of {progress.totalCredits} credits</span></strong>
          <span className="muted">completed{progress.inProgressCredits ? ` · ${progress.inProgressCredits} in progress` : ''}</span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Degree credits completed"
          aria-valuemin={0}
          aria-valuemax={progress.totalCredits}
          aria-valuenow={progress.completedCredits}
        >
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="muted small degree-req-count">
          {progress.requirementsDone} of {progress.requirementsTotal} major and core requirements done
        </p>
      </article>

      <section className="degree-block" aria-labelledby="my-courses-title">
        <h2 id="my-courses-title">My courses</h2>
        <CoursePicker catalog={catalog} taken={courses.map((c) => c.code)} onAdd={add} />
        {courses.length === 0 ? (
          <p className="muted">Add the courses you've completed or are taking now to see your progress.</p>
        ) : (
          <ul className="my-courses">
            {courses.map((c) => (
              <li key={c.code}>
                <span className="my-course-name"><strong>{c.code}</strong> <span className="muted">{title(c.code)}</span></span>
                <label className="sr-only" htmlFor={`status-${c.code}`}>Status for {c.code}</label>
                <select id={`status-${c.code}`} className="status-select" value={c.status} onChange={(e) => update(c.code, { status: e.target.value as typeof c.status })}>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In progress</option>
                </select>
                <label className="sr-only" htmlFor={`grade-${c.code}`}>Grade for {c.code}</label>
                <select
                  id={`grade-${c.code}`}
                  className="status-select"
                  value={c.grade ?? ''}
                  disabled={c.status === 'in-progress'}
                  onChange={(e) => update(c.code, { grade: (e.target.value || undefined) as LetterGrade | undefined })}
                >
                  <option value="">Grade</option>
                  {GRADE_OPTIONS.map((g) => <option key={g}>{g}</option>)}
                </select>
                <button type="button" className="link-btn" onClick={() => remove(c.code)} aria-label={`Remove ${c.code}`}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {progress.sections.map(({ section, status, requirements }) => (
        <section className="degree-block" key={section.id} aria-labelledby={`sec-${section.id}`}>
          <div className="degree-block-head">
            <h2 id={`sec-${section.id}`}>{section.title}</h2>
            <StatusBadge status={status} />
          </div>
          {section.note && <p className="muted small">{section.note}</p>}
          <ul className="req-list">
            {requirements.map((r) => (
              <li key={r.requirement.id} className="req-row">
                <div>
                  <p className="req-label">{r.requirement.label}</p>
                  <p className="muted small">
                    {requirementDetail(r)}
                    {r.requirement.minGrade && ` · minimum grade ${r.requirement.minGrade}`}
                  </p>
                  {r.requirement.note && <p className="muted small">{r.requirement.note}</p>}
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {program.needsReview.length > 0 && (
        <details className="degree-block degree-review">
          <summary>{program.needsReview.length} catalog rules aren't checked automatically yet</summary>
          <ul>
            {program.needsReview.map((item, i) => (
              <li key={i}><strong>{item.where}:</strong> {item.text} <span className="muted">({item.reason})</span></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
