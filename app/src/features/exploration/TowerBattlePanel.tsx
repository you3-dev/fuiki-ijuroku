import { allyIds, combatants, skillDefinitions } from '../../domain/battle/data'
import {
  canCommitTowerRound,
  canRequestTowerCooperation,
} from '../../domain/battle/towerBattle'
import type {
  AllyCombatantId,
  PlannedAction,
  ProtagonistSupport,
} from '../../domain/battle/types'
import type { ExplorationAction } from '../../domain/exploration/types'
import { useGameSession } from '../../app/GameSessionContext'

const allySkill = {
  tomoshigoke: 'calming-glimmer',
  numakuguri: 'burrow-guard',
  sumiwatari: 'clarifying-flow',
} as const

function actionValue(plan: PlannedAction): 'basic' | 'defend' | 'skill' {
  return plan.kind
}

function planFor(actorId: AllyCombatantId, value: string): PlannedAction {
  if (value === 'basic') return { kind: 'basic', targetId: 'kirihane' }
  if (value === 'skill') {
    const skillId = allySkill[actorId]
    return {
      kind: 'skill',
      skillId,
      targetId: skillId === 'calming-glimmer' ? 'kirihane' : 'tomoshigoke',
    }
  }
  return { kind: 'defend', targetId: actorId }
}

export function TowerBattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state, saveStatus } = useGameSession()
  const battle = state?.expedition.towerBattle
  if (!battle) return null

  async function setPlan(actorId: AllyCombatantId, plan: PlannedAction) {
    await runAction({
      type: 'towerBattleCommand',
      command: { type: 'setPlan', actorId, plan },
    })
  }

  async function commitOrResolve(isCommitted: boolean) {
    if (isCommitted) {
      if (saveStatus !== 'saved') return
      await runAction({
        type: 'towerBattleCommand',
        command: { type: 'resolveRound' },
      })
      return
    }
    const committed = await runAction({
      type: 'towerBattleCommand',
      command: { type: 'commitRound' },
    })
    if (committed) {
      await runAction({
        type: 'towerBattleCommand',
        command: { type: 'resolveRound' },
      })
    }
  }

  if (battle.outcome === 'enemy-defeated' || battle.outcome === 'party-defeated') {
    return (
      <section className="field-event-card danger-card">
        <p className="eyebrow">調査失敗・チェックポイント</p>
        <h1>{battle.outcome === 'enemy-defeated' ? '鳴き声を見失った' : '前衛が霧に倒れた'}</h1>
        <p>報酬や地域進行は加算されていません。遭遇直前の状態から再試行できます。</p>
        <ul className="battle-log">
          {battle.lastLog.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button className="primary-button full-button" type="button" onClick={() => void runAction({ type: 'retryTowerEncounter' })}>
          遭遇直前からやり直す
        </button>
      </section>
    )
  }

  const cooperationReady = canRequestTowerCooperation(battle)
  const hasKirihaneCapacity =
    [...state.party.front, ...state.party.reserve].some(
      (creature) => creature?.id === 'creature-kirihane-tower-001',
    ) || state.party.reserve.includes(null)

  return (
    <section className="standard-battle" aria-labelledby="tower-battle-title">
      <div className="standard-battle-heading">
        <div>
          <p className="eyebrow">汎用戦闘・第{battle.round}ラウンド</p>
          <h1 id="tower-battle-title">霧中のキリハネ</h1>
        </div>
        <div className="specimen-orb misted" aria-hidden="true">霧</div>
      </div>

      <div className="enemy-status-card">
        <div><span>HP</span><strong>{battle.combatants.kirihane.currentHp} / {combatants.kirihane.maxHp}</strong></div>
        <div><span>警戒度</span><strong>{battle.vigilance}</strong></div>
        <div><span>霧中</span><strong>残り{battle.mistTurns}R</strong></div>
      </div>

      <div className="tower-condition-strip" aria-label="協力条件">
        <span className={battle.callObserved ? 'condition-met' : ''}>鳴き声観察</span>
        <span className={battle.echoedCall ? 'condition-met' : ''}>周期を返す</span>
        <span className={battle.calmed ? 'condition-met' : ''}>鎮静</span>
        <span className={battle.vigilance <= 20 ? 'condition-met' : ''}>警戒20以下</span>
      </div>

      <div className="support-planner">
        <label htmlFor="tower-support">主人公の調査支援</label>
        <select
          id="tower-support"
          value={battle.supportPlan}
          disabled={battle.phase === 'committed'}
          onChange={(event) => void runAction({
            type: 'towerBattleCommand',
            command: {
              type: 'setSupport',
              support: event.target.value as ProtagonistSupport,
            },
          })}
        >
          <option value="none">支援なし</option>
          <option value="observe-call">霧中の鳴き声を観察</option>
          <option value="calming-chime" disabled={!battle.callObserved}>鎮静音具で周期を返す</option>
          <option value="request-cooperation" disabled={!cooperationReady || !hasKirihaneCapacity}>協力要請</option>
        </select>
        <small>観察ラウンドは前衛3体をすべて防御にしてください。</small>
      </div>

      <div className="ally-plan-list">
        {allyIds.map((actorId) => {
          const unit = battle.combatants[actorId]
          const plan = battle.plans[actorId]
          const skill = skillDefinitions[allySkill[actorId]]
          const needsTarget =
            plan.kind === 'skill' &&
            (plan.skillId === 'burrow-guard' || plan.skillId === 'clarifying-flow')
          return (
            <article className="ally-plan-card" key={actorId}>
              <div className="ally-plan-heading">
                <strong>{combatants[actorId].name}</strong>
                <span>HP {unit.currentHp}/{combatants[actorId].maxHp}・活性 {unit.vitality}</span>
              </div>
              <label htmlFor={`action-${actorId}`}>予定行動</label>
              <select
                id={`action-${actorId}`}
                value={actionValue(plan)}
                disabled={battle.phase === 'committed' || unit.currentHp <= 0}
                onChange={(event) => void setPlan(actorId, planFor(actorId, event.target.value))}
              >
                <option value="defend">防御（活性＋25）</option>
                <option value="basic">{combatants[actorId].basicName}（活性＋20）</option>
                <option value="skill" disabled={unit.vitality < skill.vitalityCost}>
                  {skill.name}（活性−{skill.vitalityCost}）
                </option>
              </select>
              {needsTarget && (
                <>
                  <label htmlFor={`target-${actorId}`}>対象</label>
                  <select
                    id={`target-${actorId}`}
                    value={plan.targetId}
                    disabled={battle.phase === 'committed'}
                    onChange={(event) => void setPlan(actorId, {
                      ...plan,
                      targetId: event.target.value as AllyCombatantId,
                    })}
                  >
                    {allyIds.filter((id) => plan.skillId !== 'burrow-guard' || id !== actorId).map((id) => (
                      <option key={id} value={id}>{combatants[id].name}</option>
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
          (battle.phase === 'planning' && !canCommitTowerRound(battle)) ||
          (battle.phase === 'committed' && saveStatus !== 'saved')
        }
        onClick={() => void commitOrResolve(battle.phase === 'committed')}
      >
        {battle.phase === 'committed' ? '確定済みラウンドを再開する' : '行動開始・ラウンドを確定保存'}
      </button>
    </section>
  )
}
