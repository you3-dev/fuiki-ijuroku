import type { CSSProperties } from 'react'
import { extractBattleImpacts, extractBattleRelationCue } from './battleImpact'

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
  const relation = extractBattleRelationCue(lines)
  const impacts = parsed.length > 0
    ? parsed
    : status && !relation
      ? [{ kind: 'status' as const, label: status, announcement: status }]
      : []

  if (impacts.length === 0 && !relation) return null

  const announcements = [
    relation?.announcement,
    ...impacts.map((impact) => impact.announcement),
  ].filter((announcement): announcement is string => Boolean(announcement))

  return (
    <div
      key={sequence}
      className="battle-impact-feedback"
      role="status"
      aria-label={announcements.join('、')}
    >
      {relation && (
        <div className="battle-relation-cue is-protect" aria-hidden="true">
          <strong>{relation.actor}</strong>
          <span className="battle-relation-shield">守</span>
          <span>{relation.target}をかばう</span>
        </div>
      )}
      {impacts.length > 0 && (
        <div className="battle-impact-strip" aria-hidden="true">
          {impacts.map((impact, index) => (
            <span
              key={`${impact.kind}-${impact.label}-${index}`}
              className={`battle-impact-chip is-${impact.kind}`}
              style={{ '--impact-order': index } as CSSProperties}
            >
              {impact.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
