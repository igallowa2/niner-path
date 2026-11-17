import { useId, type ReactNode } from 'react'
import { ALL_FILTERS, FILTER_GROUPS, type FilterGroupId, type FilterId, type FilterPrefs } from '../../lib/findJobs'
import { CheckIcon, ChevronDownIcon, CloseIcon } from '../icons'

interface Props {
  prefs: FilterPrefs
  onToggleFilter: (f: FilterId) => void
  onClearAll: () => void
  onToggleOpen: () => void
  onToggleGroup: (g: FilterGroupId) => void
}

/** Animates open/closed with CSS. Closed content is `inert`, so it can't be tabbed into or read. */
function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  return (
    <div className={`fj-collapse${open ? ' open' : ''}`} id={id} inert={!open}>
      <div className="fj-collapse-inner">{children}</div>
    </div>
  )
}

export function FiltersPanel({ prefs, onToggleFilter, onClearAll, onToggleOpen, onToggleGroup }: Props) {
  const baseId = useId()
  const panelId = `${baseId}-panel`
  // Keep the same order as the chips.
  const active = ALL_FILTERS.filter((f) => prefs.selected.includes(f))

  return (
    <section className="fj-filters" aria-label="Filters">
      <div className="fj-filters-header">
        <button
          type="button"
          className="fj-filters-toggle"
          aria-expanded={prefs.open}
          aria-controls={panelId}
          onClick={onToggleOpen}
        >
          <span>Filters</span>
          {active.length > 0 && <span className="fj-count" aria-label={`${active.length} active`}>({active.length})</span>}
          <span className="fj-chevron"><ChevronDownIcon /></span>
        </button>
        {active.length > 0 && (
          <button type="button" className="fj-link-btn" onClick={onClearAll}>Clear all</button>
        )}
      </div>

      {!prefs.open && active.length > 0 && (
        <ul className="fj-active-chips" aria-label="Active filters">
          {active.map((f) => (
            <li key={f}>
              <button type="button" className="fj-mini-chip" onClick={() => onToggleFilter(f)} aria-label={`Remove ${f} filter`}>
                {f} <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Collapse open={prefs.open} id={panelId}>
        <div className="fj-filter-groups">
          {FILTER_GROUPS.map((group) => {
            const groupPanelId = `${baseId}-${group.id}`
            const groupOpen = prefs.groupsOpen[group.id]
            return (
              <div className="fj-filter-group" key={group.id}>
                <button
                  type="button"
                  className="fj-group-toggle"
                  aria-expanded={groupOpen}
                  aria-controls={groupPanelId}
                  onClick={() => onToggleGroup(group.id)}
                >
                  {group.label}
                  <span className="fj-chevron"><ChevronDownIcon size={14} /></span>
                </button>
                <Collapse open={groupOpen} id={groupPanelId}>
                  <div className="fj-chips" role="group" aria-label={group.label}>
                    {group.filters.map((f) => {
                      const on = prefs.selected.includes(f)
                      return (
                        <button
                          key={f}
                          type="button"
                          className={`fj-chip${on ? ' on' : ''}`}
                          aria-pressed={on}
                          onClick={() => onToggleFilter(f)}
                        >
                          {on && <CheckIcon />}
                          {f}
                        </button>
                      )
                    })}
                  </div>
                </Collapse>
              </div>
            )
          })}
        </div>
      </Collapse>
    </section>
  )
}
