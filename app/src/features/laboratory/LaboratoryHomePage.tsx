import { Link, useNavigate } from 'react-router'
import { useGameSession } from '../../app/GameSessionContext'
import type { GameCommand } from '../../domain/session/types'
import type { CreatureSummary } from '../../domain/session/types'

function CreatureCard({ creature, slot }: { creature: CreatureSummary | null; slot: number }) {
  if (!creature) {
    return (
      <li className="creature-card empty-card">
        <span className="creature-sigil" aria-hidden="true">{slot}</span>
        <span>空き枠</span>
        <small>調査中に加入可能</small>
      </li>
    )
  }

  return (
    <li className="creature-card">
      <span className="creature-sigil" aria-hidden="true">
        {creature.displayName.slice(0, 1)}
      </span>
      <strong>{creature.displayName}</strong>
      <small>Lv.{creature.level}・{creature.role}</small>
    </li>
  )
}

export function LaboratoryHomePage() {
  const { state, execute } = useGameSession()
  const navigate = useNavigate()
  if (!state) return null

  function runCommand(command: GameCommand) {
    void execute(command).catch(() => undefined)
  }

  async function startExpedition() {
    await execute({ type: 'exploration', action: { type: 'startExpedition' } })
    navigate('/exploration')
  }

  const unreadUpdates = state.researchUpdates.filter((update) => !update.acknowledged)

  return (
    <div className="page-stack">
      <section className="page-intro">
        <p className="eyebrow">調査員 {state.profile.name}</p>
        <h2>辺境研究所</h2>
        <p>生物の反応を先に見る。記録は、その後に結論を出すためにある。</p>
      </section>

      <section className="paper-card objective-card" aria-labelledby="current-objective">
        <div className="card-heading-row">
          <div>
            <p className="card-kicker">現在の調査</p>
            <h3 id="current-objective">{state.objective.title}</h3>
          </div>
          <span className="specimen-tag">GM-01</span>
        </div>
        <p className="objective-summary">{state.objective.summary}</p>
        <div className="progress-grid" aria-label="調査進行">
          <div>
            <span>先遣隊記録</span>
            <strong>{state.objective.recordsFound}/{state.objective.recordsTotal}</strong>
          </div>
          <div>
            <span>水路弁復旧</span>
            <strong>{state.objective.valvesRestored}/{state.objective.valvesTotal}</strong>
          </div>
        </div>
        {!state.objective.preparationRecorded ? (
          <button className="primary-button full-button" type="button" onClick={() => runCommand({ type: 'recordPreparation' })}>
            調査準備を記録する
          </button>
        ) : (
          <button className="primary-button full-button" type="button" onClick={() => void startExpedition().catch(() => undefined)}>
            {state.expedition.phase !== 'idle'
              ? '調査を再開する'
              : state.expedition.firstRecruitmentCompleted
                ? '分岐調査へ出発する'
                : '灰苔湿原へ出発する'}
          </button>
        )}
        <p className="helper-text">
          地点イベントと確定済みラウンドはIndexedDBへ自動保存されます。
        </p>
      </section>

      <section className="paper-card" aria-labelledby="party-summary">
        <div className="card-heading-row">
          <div>
            <p className="card-kicker">調査隊</p>
            <h3 id="party-summary">前衛</h3>
          </div>
          <Link className="text-link" to="/party">編成を確認</Link>
        </div>
        <ul className="creature-grid">
          {state.party.front.map((creature, index) => (
            <CreatureCard key={creature?.id ?? `front-${index}`} creature={creature} slot={index + 1} />
          ))}
        </ul>
        <p className="field-note">前衛は最大3体。灰苔の浅瀬で最初の協力要請を行います。</p>
      </section>

      <section className="paper-card" aria-labelledby="research-updates">
        <div className="card-heading-row">
          <div>
            <p className="card-kicker">研究報告</p>
            <h3 id="research-updates">新しい記録</h3>
          </div>
          <span className="count-badge">{unreadUpdates.length}</span>
        </div>
        {unreadUpdates.length > 0 ? (
          <ul className="update-list">
            {unreadUpdates.map((update) => (
              <li key={update.id}>
                <div>
                  <strong>{update.title}</strong>
                  <p>{update.detail}</p>
                </div>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => runCommand({ type: 'acknowledgeUpdate', updateId: update.id })}
                >
                  確認
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-message">未確認の研究報告はありません。</p>
        )}
      </section>

      <section className="paper-card" aria-labelledby="facilities">
        <p className="card-kicker">研究設備</p>
        <h3 id="facilities">利用可能な設備</h3>
        <div className="facility-grid">
          <button className="facility-button" type="button" disabled>
            <span className="facility-light" aria-hidden="true" />
            <strong>共鳴継承</strong>
            <small>条件を満たす個体が必要</small>
          </button>
          <Link className="facility-button" to="/settings">
            <span className="record-mark" aria-hidden="true">記</span>
            <strong>設定・保存</strong>
            <small>バックアップと表示設定</small>
          </Link>
        </div>
      </section>
    </div>
  )
}
