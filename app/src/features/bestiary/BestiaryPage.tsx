import { useGameSession } from '../../app/GameSessionContext'

export function BestiaryPage() {
  const { state } = useGameSession()
  if (!state) return null
  const sumiwatariObserved =
    state.expedition.firstRecruitmentCompleted || Boolean(state.expedition.battle?.observed)
  const kirihaneObserved =
    state.expedition.towerCompleted ||
    state.expedition.phase === 'tower-result' ||
    Boolean(state.expedition.towerBattle?.callObserved)
  const entries = [
    { id: 'tomoshigoke', name: 'トモシゴケ', stage: '初期同行', mark: '灯' },
    { id: 'numakuguri', name: 'ヌマクグリ', stage: '初期同行', mark: '沼' },
    sumiwatariObserved
      ? { id: 'sumiwatari', name: 'スミワタリ', stage: '観察済み', mark: '澄' }
      : { id: 'unknown-shallows', name: '未同定', stage: '痕跡未確認', mark: '?' },
    kirihaneObserved
      ? { id: 'kirihane', name: 'キリハネ', stage: state.expedition.towerCompleted ? '協力済み' : '観察済み', mark: '霧' }
      : { id: 'unknown-tower', name: '未同定', stage: '霧中記録なし', mark: '?' },
  ]
  return (
    <div className="page-stack">
      <section className="page-intro">
        <p className="eyebrow">生態調査記録</p>
        <h2>異獣録</h2>
        <p>観察を重ねると、図版と協力条件が段階的に記録されます。</p>
      </section>

      <section className="paper-card">
        <div className="card-heading-row">
          <div>
            <p className="card-kicker">灰苔湿原</p>
            <h3>調査済み {2 + Number(sumiwatariObserved) + Number(kirihaneObserved)} / 6</h3>
          </div>
          <span className="specimen-tag">FIELD-01</span>
        </div>
        <ul className="bestiary-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className={`bestiary-mark ${entry.mark === '?' ? 'unknown-mark' : ''}`} aria-hidden="true">
                {entry.mark}
              </span>
              <div>
                <strong>{entry.name}</strong>
                <p>{entry.stage}</p>
              </div>
              <span className="chevron" aria-hidden="true">›</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
