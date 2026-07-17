import type { DefenseCoverage } from './defenseCoverage'

export function DefenseCoverageCue({
  coverage,
  recommendation,
  onRecommendation,
}: {
  coverage: DefenseCoverage
  recommendation?: string
  onRecommendation?: () => void
}) {
  return (
    <section
      className={`defense-coverage-cue is-${coverage.status}`}
      aria-label={`予兆への対応：${coverage.label}。${coverage.detail}`}
    >
      <div className="defense-coverage-copy" role="status">
        <small>予兆への対応</small>
        <strong>{coverage.label}</strong>
        <span>{coverage.detail}</span>
      </div>
      {recommendation && onRecommendation && (
        <button type="button" onClick={onRecommendation}>
          <small>推奨</small>
          <b>{recommendation}</b>
          <span aria-hidden="true">選ぶ ›</span>
        </button>
      )}
    </section>
  )
}
