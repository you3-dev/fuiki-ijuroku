import type { EnemyIntent } from './enemyIntent'

export function EnemyIntentCue({ intent }: { intent: EnemyIntent }) {
  return (
    <section
      className={`enemy-intent-cue is-${intent.tone}`}
      aria-label={`敵の予兆：${intent.action}、${intent.target}、${intent.detail}`}
    >
      <small>敵の予兆</small>
      <strong>{intent.action}</strong>
      <span aria-hidden="true">→</span>
      <b>{intent.target}</b>
      <em>{intent.detail}</em>
    </section>
  )
}
