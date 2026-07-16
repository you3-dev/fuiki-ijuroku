import type { CSSProperties } from 'react'
import { extractBattleImpacts } from './battleImpact'

export function BattleImpactStrip({
  lines,
  sequence,
  status,
}: {
  lines: string[]
  sequence: number | string
  status?: string
}) {
  const parsed = extractBattleImpacts(lines)
  const impacts = parsed.length > 0
    ? parsed
    : status
      ? [{ kind: 'status' as const, label: status, announcement: status }]
      : []

  if (impacts.length === 0) return null

  return (
    <div
      key={sequence}
      className="battle-impact-strip"
      role="status"
      aria-label={impacts.map((impact) => impact.announcement).join('、')}
    >
      {impacts.map((impact, index) => (
        <span
          key={`${impact.kind}-${impact.label}-${index}`}
          className={`battle-impact-chip is-${impact.kind}`}
          style={{ '--impact-order': index } as CSSProperties}
          aria-hidden="true"
        >
          {impact.label}
        </span>
      ))}
    </div>
  )
}
