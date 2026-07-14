import { useGameSession } from '../../app/GameSessionContext'
import { allyIds, combatants, skillDefinitions } from '../../domain/battle/data'
import {
  canCommitCoreBossRound,
  canConnectPurification,
  coreBossTargetMaxHp,
  coreBossTargetNames,
} from '../../domain/battle/coreBossBattle'
import type {
  AllyCombatantId,
  CoreBossPlanTargetId,
  CoreBossPlannedAction,
  CoreBossSupport,
  CoreBossTargetId,
} from '../../domain/battle/types'
import type { ExplorationAction } from '../../domain/exploration/types'

const targetIds: CoreBossTargetId[] = [
  'nigorigui',
  'left-pollution-mass',
  'right-pollution-mass',
]

const allySkill = {
  tomoshigoke: 'calming-glimmer',
  numakuguri: 'burrow-guard',
  sumiwatari: 'clarifying-flow',
} as const

function actionValue(plan: CoreBossPlannedAction): 'basic' | 'defend' | 'skill' {
  return plan.kind
}

function planFor(actorId: AllyCombatantId, value: string): CoreBossPlannedAction {
  if (value === 'basic') return { kind: 'basic', targetId: 'left-pollution-mass' }
  if (value === 'skill') {
    const skillId = allySkill[actorId]
    return {
      kind: 'skill',
      skillId,
      targetId:
        skillId === 'calming-glimmer'
          ? 'nigorigui'
          : skillId === 'burrow-guard'
            ? 'tomoshigoke'
            : 'left-pollution-mass',
    }
  }
  return { kind: 'defend', targetId: actorId }
}

function targetOptions(actorId: AllyCombatantId, plan: CoreBossPlannedAction) {
  if (plan.kind === 'basic') {
    return targetIds.map((id) => ({ id, name: coreBossTargetNames[id] }))
  }
  if (plan.kind !== 'skill' || plan.skillId === 'calming-glimmer') return []
  if (plan.skillId === 'burrow-guard') {
    return allyIds
      .filter((id) => id !== actorId)
      .map((id) => ({ id, name: combatants[id].name }))
  }
  return [
    ...targetIds.map((id) => ({ id, name: coreBossTargetNames[id] })),
    ...allyIds.map((id) => ({ id, name: `${combatants[id].name}（汚染除去）` })),
  ]
}

function supportEnabled(
  support: CoreBossSupport,
  battle: NonNullable<ReturnType<typeof useGameSession>['state']>['expedition']['coreBossBattle'],
) {
  if (!battle) return false
  if (support === 'none') return true
  if (support === 'observe-outlets') return battle.stage === 1 && !battle.outletsObserved
  if (support === 'rekimatoi-left') {
    const target = battle.targets['left-pollution-mass']
    return battle.stage === 1 && battle.outletsObserved && target.currentHp > 0 && target.armored
  }
  if (support === 'rekimatoi-right') {
    const target = battle.targets['right-pollution-mass']
    return battle.stage === 1 && battle.outletsObserved && target.currentHp > 0 && target.armored
  }
  if (support === 'analyze-control') return battle.stage === 2 && battle.outletProgress === 0
  if (support === 'open-outlet') return battle.stage === 2 && battle.outletProgress === 1
  return canConnectPurification(battle)
}

export function CoreBossBattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state, saveStatus } = useGameSession()
  const battle = state?.expedition.coreBossBattle
  if (!battle) return null

  async function setPlan(actorId: AllyCombatantId, plan: CoreBossPlannedAction) {
    await runAction({
      type: 'coreBossCommand',
      command: { type: 'setPlan', actorId, plan },
    })
  }

  async function commitOrResolve(isCommitted: boolean) {
    if (isCommitted) {
      if (saveStatus !== 'saved') return
      await runAction({
        type: 'coreBossCommand',
        command: { type: 'resolveRound' },
      })
      return
    }
    const committed = await runAction({
      type: 'coreBossCommand',
      command: { type: 'commitRound' },
    })
    if (committed) {
      await runAction({
        type: 'coreBossCommand',
        command: { type: 'resolveRound' },
      })
    }
  }

  if (battle.outcome === 'ecosystem-damaged' || battle.outcome === 'party-defeated') {
    return (
      <section className="field-event-card danger-card">
        <p className="eyebrow">調査失敗・ボス直前チェックポイント</p>
        <h1>
          {battle.outcome === 'ecosystem-damaged'
            ? 'ニゴリグイの生命核を損傷した'
            : '前衛が中枢の濁流に倒れた'}
        </h1>
        <p>上下流弁、濾過樹群、仲間、遺跡触媒は保持し、中枢へ入った直後から再試行します。</p>
        <ul className="battle-log">
          {battle.lastLog.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button
          className="primary-button full-button"
          type="button"
          onClick={() => void runAction({ type: 'retryCoreBoss' })}
        >
          ニゴリグイ調査をやり直す
        </button>
      </section>
    )
  }

  const stageTitle = {
    1: '第1段階・左右の汚染塊を除去',
    2: '第2段階・中央排出路を復旧',
    3: '第3段階・過負荷と警戒を解消',
  }[battle.stage]

  return (
    <section className="standard-battle core-boss-battle" aria-labelledby="core-boss-title">
      <div className="standard-battle-heading core-boss-heading">
        <div>
          <p className="eyebrow">地域ボス・第{battle.round}ラウンド</p>
          <h1 id="core-boss-title">ニゴリグイ</h1>
          <small>{stageTitle}</small>
        </div>
        <div className="specimen-orb core-orb" aria-hidden="true">核</div>
      </div>

      <div className="core-target-grid">
        {targetIds.map((targetId) => {
          const target = battle.targets[targetId]
          return (
            <article className="enemy-status-card" key={targetId}>
              <strong>{coreBossTargetNames[targetId]}</strong>
              <div><span>生態HP</span><strong>{target.currentHp} / {coreBossTargetMaxHp[targetId]}</strong></div>
              <div><span>状態</span><strong>{target.armored ? '装甲' : target.currentHp === 0 ? '除去' : '露出'}</strong></div>
            </article>
          )
        })}
      </div>

      <div className="boss-meter-grid" aria-label="中枢状態">
        <div><span>過負荷</span><strong>{battle.overload}</strong></div>
        <div><span>警戒度</span><strong>{battle.vigilance}</strong></div>
        <div><span>排出路</span><strong>{battle.outletProgress} / 2</strong></div>
      </div>

      {battle.burstWarned && (
        <div className="burst-warning" role="alert">
          <strong>次ラウンド：排出暴発</strong>
          <span>前衛3体をすべて防御させてください。</span>
        </div>
      )}

      <div className="tower-condition-strip core-condition-strip" aria-label="現在段階の達成条件">
        {battle.stage === 1 && (
          <>
            <span className={battle.outletsObserved ? 'condition-met' : ''}>排出口観察</span>
            <span className={battle.targets['left-pollution-mass'].currentHp === 0 ? 'condition-met' : ''}>左汚染除去</span>
            <span className={battle.targets['right-pollution-mass'].currentHp === 0 ? 'condition-met' : ''}>右汚染除去</span>
          </>
        )}
        {battle.stage === 2 && (
          <>
            <span className={battle.outletProgress >= 1 ? 'condition-met' : ''}>制御盤解析</span>
            <span className={battle.outletProgress === 2 ? 'condition-met' : ''}>排出路開放</span>
            <span className={battle.burstWarned ? 'condition-met' : ''}>大技予告</span>
          </>
        )}
        {battle.stage === 3 && (
          <>
            <span className={battle.overload <= 20 ? 'condition-met' : ''}>過負荷20以下</span>
            <span className={battle.vigilance <= 20 ? 'condition-met' : ''}>警戒20以下</span>
            <span className={battle.calmed ? 'condition-met' : ''}>鎮静</span>
          </>
        )}
      </div>

      <div className="support-planner">
        <label htmlFor="core-support">主人公・レキマトイの調査支援</label>
        <select
          id="core-support"
          value={battle.supportPlan}
          disabled={battle.phase === 'committed'}
          onChange={(event) => void runAction({
            type: 'coreBossCommand',
            command: { type: 'setSupport', support: event.target.value as CoreBossSupport },
          })}
        >
          <option value="none">支援なし</option>
          <option value="observe-outlets" disabled={!supportEnabled('observe-outlets', battle)}>排出口を観察</option>
          <option value="rekimatoi-left" disabled={!supportEnabled('rekimatoi-left', battle)}>レキマトイ：左の装甲を礫砕き</option>
          <option value="rekimatoi-right" disabled={!supportEnabled('rekimatoi-right', battle)}>レキマトイ：右の装甲を礫砕き</option>
          <option value="analyze-control" disabled={!supportEnabled('analyze-control', battle)}>制御盤を解析</option>
          <option value="open-outlet" disabled={!supportEnabled('open-outlet', battle)}>中央排出路を開放</option>
          <option value="connect-purification" disabled={!supportEnabled('connect-purification', battle)}>浄化経路を接続</option>
        </select>
        <small>段階に応じて、選べる環境操作が変わります。</small>
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
                <span>HP {ally.currentHp}/{combatants[actorId].maxHp}・活性 {ally.vitality}・汚染 {ally.pollution}</span>
              </div>
              <label htmlFor={`core-action-${actorId}`}>予定行動</label>
              <select
                id={`core-action-${actorId}`}
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
                  <label htmlFor={`core-target-${actorId}`}>対象</label>
                  <select
                    id={`core-target-${actorId}`}
                    value={plan.targetId}
                    disabled={battle.phase === 'committed'}
                    onChange={(event) => {
                      const targetId = event.target.value as CoreBossPlanTargetId
                      if (plan.kind === 'basic') {
                        void setPlan(actorId, { ...plan, targetId: targetId as CoreBossTargetId })
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
          (battle.phase === 'planning' && !canCommitCoreBossRound(battle)) ||
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
