import { useId, useState, type KeyboardEvent } from 'react'
import type { CourseIndex } from '../../lib/catalog/progress'
import { searchCourses } from '../../lib/catalog/search'
import type { CompletedCourse, Course } from '../../lib/catalog/types'

interface Props {
  catalog: CourseIndex
  /** Codes already on the student's list (hidden from results). */
  taken: string[]
  onAdd: (course: CompletedCourse) => void
}

/** Searchable combobox for adding a course, plus whether it's done or in progress. */
export function CoursePicker({ catalog, taken, onAdd }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<CompletedCourse['status']>('completed')
  const results = searchCourses(catalog, query, taken)
  const open = results.length > 0

  function choose(course: Course) {
    onAdd({ code: course.code, status })
    setQuery('')
    setActive(0)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[Math.min(active, results.length - 1)]) }
    else if (e.key === 'Escape') { setQuery('') }
  }

  return (
    <div className="course-picker">
      <div className="course-picker-row">
        <div className="field course-picker-search">
          <label htmlFor={`${id}-input`}>Add a course</label>
          <input
            id={`${id}-input`}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search by code or title, e.g. ECON 2101"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-status`}>Status</label>
          <select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as CompletedCourse['status'])}>
            <option value="completed">Completed</option>
            <option value="in-progress">In progress</option>
          </select>
        </div>
      </div>
      {open && (
        <ul className="course-picker-list" id={listId} role="listbox" aria-label="Matching courses">
          {results.map((c, i) => (
            <li
              key={c.code}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onMouseDown={(e) => { e.preventDefault(); choose(c) }}
              onMouseEnter={() => setActive(i)}
            >
              <strong>{c.code}</strong> {c.title} <span className="muted small">· {c.credits} cr</span>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && !open && <p className="muted small">No matching courses in the catalog data.</p>}
    </div>
  )
}
