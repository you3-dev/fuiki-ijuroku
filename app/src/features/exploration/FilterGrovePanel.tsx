import { useGameSession } from '../../app/GameSessionContext'
import { canRequestGroveCooperation } from '../../domain/exploration/commands'
import type { ExplorationAction } from '../../domain/exploration/types'

export function FilterGrovePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state } = useGameSession()
  const encounter = state?.expedition.groveEncounter
  if (!encounter) return null

  if (!encounter.shellIntact) {
    return (
      <section className="field-event-card danger-card">
        <p className="eyebrow">生態保全失敗・チェックポイント</p>
        <h1>石殻に亀裂が走った</h1>
        <p>装置へ急ぐため外殻を傷つけました。レキマトイが退避したため、接触直前から調査をやり直します。</p>
        <button
          className="primary-button full-button"
          type="button"
          onClick={() => void runAction({ type: 'retryGroveEncounter' })}
        >
          防御隊形からやり直す
        </button>
      </section>
    )
  }

  const cooperationReady = canRequestGroveCooperation(encounter)
  const messages = {
    encountered: '石殻の異獣が、小型装置から漏れる波動を受けて樹根を削っています。',
    'wave-observed': '外殻ではなく、背後の発生装置が警戒行動を引き起こしています。',
    'emitter-stopped': '波動が止まりました。前衛が防御隊形を保つと、石殻の震えが弱まります。',
    'fragment-offered': '安定した遺跡片を置くと、レキマトイは古い殻片を外して並べました。',
    'shell-damaged': '外殻に亀裂が走り、レキマトイが樹群の奥へ退避しました。',
  } as const

  return (
    <section className="encounter-card grove-encounter" aria-labelledby="grove-title">
      <div className="encounter-heading">
        <div>
          <p className="eyebrow">生態接触・第{encounter.round}段階</p>
          <h2 id="grove-title">波動に震える石殻</h2>
        </div>
        <div className="specimen-orb grove-orb" aria-hidden="true">礫</div>
      </div>

      <p className="encounter-message" role="status">{messages[encounter.lastAction]}</p>

      <div className="battle-meters">
        <div>
          <span>警戒度</span>
          <strong>{encounter.vigilance}</strong>
          <div className="meter-track"><span style={{ width: `${encounter.vigilance}%` }} /></div>
        </div>
        <div>
          <span>外殻</span>
          <strong>{encounter.shellIntact ? '無傷' : '損傷'}</strong>
        </div>
      </div>

      <div className="condition-strip" aria-label="協力条件">
        <span className={encounter.waveObserved ? 'condition-met' : ''}>波動観察</span>
        <span className={encounter.emitterStopped ? 'condition-met' : ''}>装置停止</span>
        <span className={encounter.stableFragmentOffered ? 'condition-met' : ''}>遺跡片</span>
        <span className={encounter.vigilance <= 20 ? 'condition-met' : ''}>警戒20以下</span>
      </div>

      <div className="battle-actions">
        <button
          type="button"
          disabled={encounter.waveObserved}
          onClick={() => void runAction({ type: 'groveAction', action: 'observeWave' })}
        >
          <strong>主人公：遺跡波動を観察</strong>
          <small>異獣ではなく、警戒行動の原因を調べる</small>
        </button>
        <button
          type="button"
          disabled={!encounter.waveObserved || encounter.emitterStopped}
          onClick={() => void runAction({ type: 'groveAction', action: 'stopEmitter' })}
        >
          <strong>小型発生装置を停止</strong>
          <small>前衛は攻撃せず、防御隊形を維持する</small>
        </button>
        <button
          type="button"
          disabled={!encounter.emitterStopped || encounter.stableFragmentOffered}
          onClick={() => void runAction({ type: 'groveAction', action: 'offerStableFragment' })}
        >
          <strong>安定した遺跡片を示す</strong>
          <small>交換ではなく、安全な物質を選べる場所を作る</small>
        </button>
        <button
          className="cooperation-action"
          type="button"
          disabled={!cooperationReady}
          onClick={() => void runAction({ type: 'groveAction', action: 'requestCooperation' })}
        >
          <strong>協力要請</strong>
          <small>{cooperationReady ? '条件達成・必ず成功します' : '波動と警戒の条件を満たす必要があります'}</small>
        </button>
        <button
          className="risky-field-action"
          type="button"
          onClick={() => void runAction({ type: 'groveAction', action: 'damageShell' })}
        >
          <strong>外殻を砕いて装置へ近づく</strong>
          <small>速いが、生態保全に反する危険な方法</small>
        </button>
      </div>
    </section>
  )
}
