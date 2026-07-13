import { useGameSession } from '../../app/GameSessionContext'
import { allyIds, combatants, skillDefinitions } from '../../domain/battle/data'
import {
  canCommitWaterwayRound,
  canSecureWaterway,
  targetMaxHp,
  targetNames,
} from '../../domain/battle/waterwayBattle'
import type {
  AllyCombatantId,
  WaterwayPlanTargetId,
  WaterwayPlannedAction,
  WaterwayTargetId,
} from '../../domain/battle/types'
import type { ExplorationAction } from '../../domain/exploration/types'

const waterwayTargetIds: WaterwayTargetId[] = [
  'pollution-mass',
  'polluted-sumiwatari',
]

const allySkill = {
  tomoshigoke: 'calming-glimmer',
  numakuguri: 'burrow-guard',
  sumiwatari: 'clarifying-flow',
} as const

function actionValue(plan: WaterwayPlannedAction): 'basic' | 'defend' | 'skill' {
  return plan.kind
}

function planFor(actorId: AllyCombatantId, value: string): WaterwayPlannedAction {
  if (value === 'basic') return { kind: 'basic', targetId: 'pollution-mass' }
  if (value === 'skill') {
    const skillId = allySkill[actorId]
    return {
      kind: 'skill',
      skillId,
      targetId:
        skillId === 'calming-glimmer'
          ? 'polluted-sumiwatari'
          : skillId === 'burrow-guard'
            ? 'tomoshigoke'
            : 'pollution-mass',
    }
  }
  return { kind: 'defend', targetId: actorId }
}

function targetOptions(actorId: AllyCombatantId, plan: WaterwayPlannedAction) {
  if (plan.kind === 'basic') {
    return waterwayTargetIds.map((id) => ({ id, name: targetNames[id] }))
  }
  if (plan.kind !== 'skill' || plan.skillId === 'calming-glimmer') return []
  if (plan.skillId === 'burrow-guard') {
    return allyIds
      .filter((id) => id !== actorId)
      .map((id) => ({ id, name: combatants[id].name }))
  }
  return [
    ...waterwayTargetIds.map((id) => ({ id, name: targetNames[id] })),
    ...allyIds.map((id) => ({ id, name: `${combatants[id].name}（汚染除去）` })),
  ]
}

export function WaterwayBattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state, saveStatus } = useGameSession()
  const battle = state?.expedition.waterwayBattle
  if (!battle) return null

  async function setPlan(actorId: AllyCombatantId, plan: WaterwayPlannedAction) {
    await runAction({
      type: 'waterwayBattleCommand',
      command: { type: 'setPlan', actorId, plan },
    })
  }

  async function commitOrResolve(isCommitted: boolean) {
    if (isCommitted) {
      if (saveStatus !== 'saved') return
      await runAction({
        type: 'waterwayBattleCommand',
        command: { type: 'resolveRound' },
      })
      return
    }
    const committed = await runAction({
      type: 'waterwayBattleCommand',
      command: { type: 'commitRound' },
    })
    if (committed) {
      await runAction({
        type: 'waterwayBattleCommand',
        command: { type: 'resolveRound' },
      })
    }
  }

  if (battle.outcome === 'ecosystem-damaged' || battle.outcome === 'party-defeated') {
    return (
      <section className="field-event-card danger-card">
        <p className="eyebrow">調査失敗・チェックポイント</p>
        <h1>
          {battle.outcome === 'ecosystem-damaged'
            ? '調査対象を傷つけすぎた'
            : '前衛が濁流に倒れた'}
        </h1>
        <p>事前に選んだ進入方法は保持し、汚染戦の開始直前から再試行できます。</p>
        <ul className="battle-log">
          {battle.lastLog.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button
          className="primary-button full-button"
          type="button"
          onClick={() => void runAction({ type: 'retryWaterwayEncounter' })}
        >
          汚染戦をやり直す
        </button>
      </section>
    )
  }

  const secureReady = canSecureWaterway(battle)

  return (
    <section className="standard-battle" aria-labelledby="waterway-battle-title">
      <div className="standard-battle-heading">
        <div>
          <p className="eyebrow">複数対象戦・第{battle.round}ラウンド</p>
          <h1 id="waterway-battle-title">沈殿物の下の濾過音</h1>
        </div>
        <div className="specimen-orb polluted-orb" aria-hidden="true">濁</div>
      </div>

      <div className="waterway-target-grid">
        {waterwayTargetIds.map((targetId) => {
          const target = battle.targets[targetId]
          return (
            <article className="enemy-status-card" key={targetId}>
              <strong>{targetNames[targetId]}</strong>
              <div><span>生態HP</span><strong>{target.currentHp} / {targetMaxHp[targetId]}</strong></div>
              <div><span>汚染値</span><strong>{target.pollution}</strong></div>
            </article>
          )
        })}
      </div>

      <div className="tower-condition-strip" aria-label="安全確保条件">
        <span className={battle.targets['pollution-mass'].pollution === 0 ? 'condition-met' : ''}>汚染塊0</span>
        <span className={battle.targets['polluted-sumiwatari'].pollution === 0 ? 'condition-met' : ''}>野生個体0</span>
        <span className={battle.vigilance <= 20 ? 'condition-met' : ''}>警戒20以下</span>
        <span className={battle.calmed ? 'condition-met' : ''}>鎮静</span>
      </div>

      <div className="support-planner">
        <label htmlFor="waterway-support">主人公の調査支援</label>
        <select
          id="waterway-support"
          value={battle.supportPlan}
          disabled={battle.phase === 'committed'}
          onChange={(event) => void runAction({
            type: 'waterwayBattleCommand',
            command: {
              type: 'setSupport',
              support: event.target.value as 'none' | 'indicate-safe-route',
            },
          })}
        >
          <option value="none">支援なし</option>
          <option value="indicate-safe-route" disabled={!secureReady}>安全な流路を示す</option>
        </select>
        <small>
          {battle.observedSource
            ? '観察記録により、汚染塊への澄み流しが60低下になります。'
            : '汚染塊が残るラウンドは、前衛全体へ汚染が広がります。'}
        </small>
      </div>

      <div className="ally-plan-list">
        {allyIds.map((actorId) => {
          const ally = battle.allies[actorId]
          const plan = battle.plans[actorId]
          const skill = skillDefinitions[allySkill[actorId]]
          const options = targetOptions(actorId, plan)
          return (
            <article className="ally-plan-card" key={actorId}>
              <div className="ally-plan-heading">
                <strong>{combatants[actorId].name}</strong>
                <span>
                  HP {ally.currentHp}/{combatants[actorId].maxHp}・活性 {ally.vitality}・汚染 {ally.pollution}
                </span>
              </div>
              <label htmlFor={`waterway-action-${actorId}`}>予定行動</label>
              <select
                id={`waterway-action-${actorId}`}
                value={actionValue(plan)}
                disabled={battle.phase === 'committed' || ally.currentHp <= 0}
                onChange={(event) => void setPlan(actorId, planFor(actorId, event.target.value))}
              >
                <option value="defend">防御（活性＋25）</option>
                <option value="basic">{combatants[actorId].basicName}（対象HPへ被害）</option>
                <option value="skill" disabled={ally.vitality < skill.vitalityCost}>
                  {skill.name}（活性－{skill.vitalityCost}）
                </option>
              </select>
              {options.length > 0 && (
                <>
                  <label htmlFor={`waterway-target-${actorId}`}>対象</label>
                  <select
                    id={`waterway-target-${actorId}`}
                    value={plan.targetId}
                    disabled={battle.phase === 'committed'}
                    onChange={(event) => {
                      const targetId = event.target.value as WaterwayPlanTargetId
                      if (plan.kind === 'basic') {
                        void setPlan(actorId, {
                          ...plan,
                          targetId: targetId as WaterwayTargetId,
                        })
                      } else if (plan.kind === 'skill') {
                        void setPlan(actorId, { ...plan, targetId })
                      }
                    }}
                  >
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </>
              )}
            </article>
          )
        })}
      </div>

      <div className="battle-log" aria-live="polite">
        <strong>前ラウンドの記録</strong>
        <ul>{battle.lastLog.map((line) => <li key={line}>{line}</li>)}</ul>
      </div>

      <button
        className="primary-button full-button battle-commit-button"
        type="button"
        disabled={
          (battle.phase === 'planning' && !canCommitWaterwayRound(battle)) ||
          (battle.phase === 'committed' && saveStatus !== 'saved')
        }
        onClick={() => void commitOrResolve(battle.phase === 'committed')}
      >
        {battle.phase === 'committed'
          ? '確定済みラウンドを再開する'
          : '行動開始・ラウンドを確定保存'}
      </button>
    </section>
  )
}
