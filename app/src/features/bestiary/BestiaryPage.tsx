const entries = [
  { id: 'tomoshigoke', name: 'トモシゴケ', stage: '初期同行', mark: '灯' },
  { id: 'numakuguri', name: 'ヌマクグリ', stage: '初期同行', mark: '沼' },
  { id: 'unknown-shallows', name: '未同定', stage: '痕跡未確認', mark: '?' },
]

export function BestiaryPage() {
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
            <h3>調査済み 2 / 6</h3>
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
