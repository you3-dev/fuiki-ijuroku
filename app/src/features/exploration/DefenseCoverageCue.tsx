import type { DefenseCoverage } from './defenseCoverage'

export function DefenseCoverageCue({ coverage }: { coverage: DefenseCoverage }) {
  return (
    <p
      className={`defense-coverage-cue is-${coverage.status}`}
      role="status"
      aria-label={`予兆への対応：${coverage.label}。${coverage.detail}`}
    >
      <small>予兆への対応</small>
      <strong>{coverage.label}</strong>
      <span>{coverage.detail}</span>
    </p>
  )
}
