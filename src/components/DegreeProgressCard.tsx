interface DegreeProgressCardProps {
  completedCredits?: number
  totalCredits?: number
  catalogYear?: string
  expectedGraduation?: string
  onViewDegree?: () => void
}

export function DegreeProgressCard({
  completedCredits = 72,
  totalCredits = 120,
  catalogYear = '2024-2025',
  expectedGraduation = 'May 2027',
  onViewDegree = () => { window.location.hash = '#/degree' },
}: DegreeProgressCardProps) {
  const progress = Math.min(Math.max((completedCredits / totalCredits) * 100, 0), 100)

  return (
    <article className="degree-card" aria-labelledby="degree-progress-title">
      <div className="degree-card-header">
        <div>
          <p className="eyebrow">Academic progress</p>
          <h2 id="degree-progress-title">Degree progress</h2>
        </div>
        <span className="degree-percent">{Math.round(progress)}%</span>
      </div>

      <div className="degree-progress-summary">
        <strong>{completedCredits} <span>of {totalCredits} credits</span></strong>
        <span className="muted">completed</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Degree credits completed"
        aria-valuemin={0}
        aria-valuemax={totalCredits}
        aria-valuenow={completedCredits}
      >
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="degree-details">
        <div>
          <span className="muted">Catalog year</span>
          <strong>{catalogYear}</strong>
        </div>
        <div>
          <span className="muted">Expected graduation</span>
          <strong>{expectedGraduation}</strong>
        </div>
      </div>

      <button className="btn primary" type="button" onClick={onViewDegree}>View degree</button>
    </article>
  )
}
