import { useEffect, useState } from 'react'
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
  WaterwayBattleState,
  WaterwayPlanTargetId,
  WaterwayPlannedAction,
  WaterwaySupport,
  WaterwayTargetId,
} from '../../domain/battle/types'
import type { ExplorationAction } from '../../domain/exploration/types'
import { BattleCommandMenu } from './BattleCommandMenu'
import { BattleImpactStrip } from './BattleImpactStrip'
import { BattleValueBar } from './BattleValueBar'
import { AllyStateBadge } from './AllyStateBadge'

const waterwayTargetIds: WaterwayTargetId[] = [
  'pollution-mass',
  'polluted-sumiwatari',
]

const allySkill = {
  tomoshigoke: 'calming-glimmer',
  numakuguri: 'burrow-guard',
  sumiwatari: 'clarifying-flow',
} as const

const allyRole = {
  tomoshigoke: '回復・鎮静',
  numakuguri: '防御・かばう',
  sumiwatari: '浄化・回復',
} as const

const planNames = {
  basic: 'たたかう',
  defend: '防御',
  skill: '特技',
} as const

type WaterwayGuidance = {
  step: 1 | 2 | 3 | 4
  objective: string
  explanation: string
  recommendedActor: AllyCombatantId | null
  planLines: string[]
  forecast: string[]
}

function guidanceFor(battle: WaterwayBattleState): WaterwayGuidance {
  if (battle.targets['pollution-mass'].pollution > 0) {
    return {
      step: 1,
      objective: '汚染の発生源を浄化する',
      explanation: 'スミワタリの澄み流しを汚染塊へ使い、黒い沈殿の拡散を止めます。',
      recommendedActor: 'sumiwatari',
      planLines: [
        'スミワタリ：澄み流し → 汚染塊',
        'トモシゴケ：静かな明滅',
        'ヌマクグリ：防御または身代わり潜行',
      ],
      forecast: ['汚染塊の汚染値を低下', '静かな明滅で警戒度－20'],
    }
  }

  if (
    battle.targets['polluted-sumiwatari'].pollution > 0 &&
    battle.allies.sumiwatari.vitality < skillDefinitions['clarifying-flow'].vitalityCost
  ) {
    return {
      step: 2,
      objective: '澄み流しの活性を蓄える',
      explanation: 'スミワタリの活性が足りません。防御して次の浄化へ備えます。',
      recommendedActor: 'sumiwatari',
      planLines: ['前衛3体：防御'],
      forecast: ['被害を軽減', 'スミワタリの活性＋25'],
    }
  }

  if (battle.targets['polluted-sumiwatari'].pollution > 0) {
    return {
      step: 2,
      objective: '野生スミワタリを浄化する',
      explanation: '生態HPを削らず、澄み流しで付着した汚染だけを落とします。',
      recommendedActor: 'sumiwatari',
      planLines: [
        'スミワタリ：澄み流し → 野生スミワタリ',
        'ほかの前衛：防御',
      ],
      forecast: ['野生個体の汚染値－40', '対象の生態HPを維持'],
    }
  }

  if (
    (!battle.calmed || battle.vigilance > 20) &&
    battle.allies.tomoshigoke.vitality < skillDefinitions['calming-glimmer'].vitalityCost
  ) {
    return {
      step: 3,
      objective: '静かな明滅の活性を蓄える',
      explanation: 'トモシゴケの活性が足りません。防御して警戒を鎮める準備をします。',
      recommendedActor: 'tomoshigoke',
      planLines: ['前衛3体：防御'],
      forecast: ['被害を軽減', 'トモシゴケの活性＋25'],
    }
  }

  if (!battle.calmed || battle.vigilance > 20) {
    return {
      step: 3,
      objective: '野生個体の警戒を鎮める',
      explanation: 'トモシゴケの静かな明滅で、敵意がないことを伝えます。',
      recommendedActor: 'tomoshigoke',
      planLines: ['トモシゴケ：静かな明滅', 'ほかの前衛：防御'],
      forecast: ['鎮静を付与', '警戒度－20'],
    }
  }

  return {
    step: 4,
    objective: '安全な流路を示す',
    explanation: '浄化と鎮静が完了しました。主人公の調査から流路を指示します。',
    recommendedActor: null,
    planLines: ['主人公：安全な流路を示す', '前衛3体：防御'],
    forecast: ['安全確保は必ず成功', '下流弁の復旧へ進む'],
  }
}

function summarizeRound(battle: WaterwayBattleState): string[] {
  if (battle.round === 1) return []
  const priorities = [
    '澄み流し',
    '静かな明滅',
    '汚染の拡散が止まり',
    '黒い沈殿',
    '濁流弾',
    '生態被害',
  ]
  const selected = priorities.flatMap((keyword) =>
    battle.lastLog.filter((line) => line.includes(keyword)),
  )
  return [...new Set(selected)].slice(0, 3)
}

function fixedSkillPlan(
  battle: WaterwayBattleState,
  actorId: Exclude<AllyCombatantId, 'sumiwatari'>,
): WaterwayPlannedAction {
  if (actorId === 'tomoshigoke') {
    return {
      kind: 'skill',
      skillId: 'calming-glimmer',
      targetId: 'polluted-sumiwatari',
    }
  }
  const targetId = battle.allies.tomoshigoke.currentHp > 0
    ? 'tomoshigoke'
    : 'sumiwatari'
  return { kind: 'skill', skillId: 'burrow-guard', targetId }
}

function planLabel(plan: WaterwayPlannedAction): string {
  if (plan.kind === 'defend') return '防御'
  if (plan.kind === 'basic') return `たたかう → ${targetNames[plan.targetId]}`
  const skillName = skillDefinitions[plan.skillId].name
  if (plan.skillId === 'clarifying-flow') {
    const targetName = allyIds.includes(plan.targetId as AllyCombatantId)
      ? combatants[plan.targetId as AllyCombatantId].name
      : targetNames[plan.targetId as WaterwayTargetId]
    return `${skillName} → ${targetName}`
  }
  if (plan.skillId === 'burrow-guard') {
    return `${skillName} → ${combatants[plan.targetId as AllyCombatantId].name}`
  }
  return skillName
}

export function WaterwayBattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state, saveStatus } = useGameSession()
  const [activeActor, setActiveActor] = useState<AllyCombatantId>('sumiwatari')
  const [skillOpen, setSkillOpen] = useState(true)
  const [targetMode, setTargetMode] = useState<'attack' | 'clarifying-flow' | null>('clarifying-flow')
  const [researchOpen, setResearchOpen] = useState(false)
  const battle = state?.expedition.waterwayBattle
  const pollutionMass = battle?.targets['pollution-mass'].pollution ?? 0
  const wildPollution = battle?.targets['polluted-sumiwatari'].pollution ?? 0
  const secureAvailable = battle ? canSecureWaterway(battle) : false
  const calmingNeeded = battle ? !battle.calmed || battle.vigilance > 20 : false

  useEffect(() => {
    if (secureAvailable) {
      setResearchOpen(true)
      setSkillOpen(false)
      setTargetMode(null)
      return
    }
    if (pollutionMass > 0 || wildPollution > 0) {
      setActiveActor('sumiwatari')
      setSkillOpen(true)
      setTargetMode('clarifying-flow')
    } else if (calmingNeeded) {
      setActiveActor('tomoshigoke')
      setSkillOpen(true)
      setTargetMode(null)
    }
  }, [calmingNeeded, pollutionMass, secureAvailable, wildPollution])

  if (!battle) return null
  const currentBattle = battle

  async function setPlan(actorId: AllyCombatantId, plan: WaterwayPlannedAction) {
    const changed = await runAction({
      type: 'waterwayBattleCommand',
      command: { type: 'setPlan', actorId, plan },
    })
    if (!changed) return
    setSkillOpen(false)
    setTargetMode(null)
    const index = allyIds.indexOf(actorId)
    setActiveActor(allyIds[(index + 1) % allyIds.length])
  }

  async function setSupport(support: WaterwaySupport) {
    const changed = await runAction({
      type: 'waterwayBattleCommand',
      command: { type: 'setSupport', support },
    })
    if (changed) setResearchOpen(false)
  }

  async function commitOrResolve() {
    if (currentBattle.phase === 'committed') {
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

  const guidance = guidanceFor(battle)
  const resultSummary = summarizeRound(battle)
  const activeUnit = battle.allies[activeActor]
  const activeSkill = skillDefinitions[allySkill[activeActor]]
  const commandsLocked = battle.phase === 'committed' || activeUnit.currentHp <= 0
  const clarifyingTargets: Array<{
    id: WaterwayPlanTargetId
    name: string
    detail: string
    clean: boolean
  }> = [
    {
      id: 'pollution-mass',
      name: '汚染塊',
      detail: `汚染 ${battle.targets['pollution-mass'].pollution}`,
      clean: battle.targets['pollution-mass'].pollution === 0,
    },
    {
      id: 'polluted-sumiwatari',
      name: '野生スミワタリ',
      detail: `汚染 ${battle.targets['polluted-sumiwatari'].pollution}`,
      clean: battle.targets['polluted-sumiwatari'].pollution === 0,
    },
    ...allyIds
      .filter((actorId) => battle.allies[actorId].pollution > 0)
      .map((actorId) => ({
        id: actorId as WaterwayPlanTargetId,
        name: combatants[actorId].name,
        detail: `汚染 ${battle.allies[actorId].pollution}・小回復`,
        clean: false,
      })),
  ]

  return (
    <section className="tower-command-battle waterway-command-battle" aria-labelledby="waterway-battle-title">
      <div className="standard-battle-heading">
        <div>
          <p className="eyebrow">汚染調査・第{battle.round}ラウンド</p>
          <h1 id="waterway-battle-title">沈殿物の下の濾過音</h1>
        </div>
        <div className="specimen-orb polluted-orb" aria-hidden="true">濁</div>
      </div>

      <section className="tower-current-objective" aria-label="今回の目的">
        <small>今回の目的 {guidance.step}/4</small>
        <strong>{guidance.objective}</strong>
        <span>{guidance.explanation}</span>
      </section>

      <div className="waterway-target-overview" aria-label="浄化対象">
        {waterwayTargetIds.map((targetId) => {
          const target = battle.targets[targetId]
          return (
            <article key={targetId}>
              <strong>{targetNames[targetId]}</strong>
              <span>生態HP {target.currentHp}/{targetMaxHp[targetId]}</span>
              <b>汚染 {target.pollution}</b>
              <BattleValueBar
                value={target.pollution}
                max={100}
                label={`${targetNames[targetId]}の汚染値`}
                tone="pollution"
                compact
              />
            </article>
          )
        })}
      </div>
      <p className="tower-risk-note">生態HPを削ると調査失敗です。「澄み流し」で汚染値だけを下げます。</p>

      <div className="tower-command-conditions" aria-label="安全確保条件">
        <span className={battle.targets['pollution-mass'].pollution === 0 ? 'is-met' : ''}>汚染塊0{battle.targets['pollution-mass'].pollution === 0 ? ' ✓' : ''}</span>
        <span className={battle.targets['polluted-sumiwatari'].pollution === 0 ? 'is-met' : ''}>野生個体0{battle.targets['polluted-sumiwatari'].pollution === 0 ? ' ✓' : ''}</span>
        <span className={battle.vigilance <= 20 ? 'is-met' : ''}>警戒20以下{battle.vigilance <= 20 ? ' ✓' : ''}</span>
        <span className={battle.calmed ? 'is-met' : ''}>鎮静{battle.calmed ? ' ✓' : ''}</span>
      </div>

      <p className="waterway-approach-note">
        {battle.observedSource
          ? '取水桝の観察済み：汚染塊への最初の澄み流しが強化されています。'
          : '強行進入：汚染塊が残るラウンドは前衛全体へ汚染が広がります。'}
      </p>

      {resultSummary.length > 0 && (
        <section className="tower-round-result">
          <small>前のラウンド</small>
          <BattleImpactStrip lines={battle.lastLog} sequence={battle.round} status="行動結果を更新" />
          <ul>{resultSummary.map((line) => <li key={line}>{line}</li>)}</ul>
        </section>
      )}

      <section className="tower-research-panel" aria-label="主人公の調査行動">
        <button
          className="tower-research-toggle"
          type="button"
          aria-expanded={researchOpen}
          disabled={battle.phase === 'committed'}
          onClick={() => setResearchOpen((open) => !open)}
        >
          <span aria-hidden="true">調</span>
          <strong>主人公：調査</strong>
          <small>{battle.supportPlan === 'indicate-safe-route' ? '選択中：安全な流路を示す' : '浄化後に安全な流路を指示'}</small>
        </button>
        {researchOpen && (
          <div className="tower-research-actions">
            <button
              type="button"
              className={battle.supportPlan === 'indicate-safe-route' ? 'is-selected' : undefined}
              disabled={!secureAvailable}
              onClick={() => void setSupport('indicate-safe-route')}
            >
              <strong>安全な流路を示す</strong>
              <span>{secureAvailable ? '条件達成・必ず成功' : '4つの安全確保条件を達成後に使用'}</span>
            </button>
            {battle.supportPlan !== 'none' && (
              <button type="button" onClick={() => void setSupport('none')}>
                <strong>支援なし</strong><span>主人公は周囲を警戒する</span>
              </button>
            )}
          </div>
        )}
      </section>

      <div className="tower-ally-tabs" role="tablist" aria-label="前衛3体">
        {allyIds.map((actorId) => {
          const unit = battle.allies[actorId]
          const plan = battle.plans[actorId]
          return (
            <button
              key={actorId}
              type="button"
              role="tab"
              aria-selected={activeActor === actorId}
              className={`${activeActor === actorId ? 'is-active' : ''} ${unit.pollution > 0 ? 'is-polluted' : ''}`}
              onClick={() => {
                setActiveActor(actorId)
                setSkillOpen(false)
                setTargetMode(null)
              }}
            >
              <strong>{combatants[actorId].name}</strong>
              <span className="ally-tab-hp">
                HP {unit.currentHp}/{combatants[actorId].maxHp}
                <BattleValueBar
                  value={unit.currentHp}
                  max={combatants[actorId].maxHp}
                  label={`${combatants[actorId].name}のHP`}
                  compact
                  decorative
                />
              </span>
              {unit.pollution > 0 ? (
                <AllyStateBadge tone="pollution">汚染 {unit.pollution}</AllyStateBadge>
              ) : plan.kind === 'defend' ? (
                <AllyStateBadge tone="guard">防御予定</AllyStateBadge>
              ) : actorId === 'numakuguri' && plan.kind === 'skill' ? (
                <AllyStateBadge tone="protect">
                  {combatants[plan.targetId as AllyCombatantId].name}を守る
                </AllyStateBadge>
              ) : (
                <small>予定：{planNames[plan.kind]}</small>
              )}
            </button>
          )
        })}
      </div>

      <section className="tower-active-command" aria-label={`${combatants[activeActor].name}の状態と行動`}>
        <div className="active-ally-status">
          <div><span>{combatants[activeActor].name}</span><strong>{allyRole[activeActor]}</strong></div>
          <p><span>HP {activeUnit.currentHp}/{combatants[activeActor].maxHp}</span><span>活性 {activeUnit.vitality}/100</span><span>汚染 {activeUnit.pollution}</span></p>
        </div>
        <BattleCommandMenu
          actorName={combatants[activeActor].name}
          skillOpen={skillOpen}
          selectedAction={
            battle.plans[activeActor].kind === 'basic'
              ? 'attack'
              : battle.plans[activeActor].kind
          }
          focusAction={
            targetMode === 'attack'
              ? 'attack'
              : skillOpen
                ? 'skill'
                : undefined
          }
          attackDisabled={commandsLocked}
          attackHint="対象HPへ被害・調査失敗の危険"
          skillDisabled={commandsLocked}
          defendDisabled={commandsLocked}
          onAttack={() => {
            setSkillOpen(false)
            setTargetMode('attack')
          }}
          onToggleSkills={() => {
            setSkillOpen((open) => !open)
            setTargetMode(null)
          }}
          onDefend={() => void setPlan(activeActor, { kind: 'defend', targetId: activeActor })}
        />

        {targetMode === 'attack' && (
          <div className="waterway-target-picker" aria-label="攻撃対象">
            <small>たたかう対象</small>
            {waterwayTargetIds.map((targetId) => (
              <button
                key={targetId}
                type="button"
                disabled={commandsLocked}
                onClick={() => void setPlan(activeActor, { kind: 'basic', targetId })}
              >
                <strong>{targetNames[targetId]}</strong>
                <span>生態HP {battle.targets[targetId].currentHp}/{targetMaxHp[targetId]}</span>
              </button>
            ))}
          </div>
        )}

        {skillOpen && (
          <div className="tower-skill-list" aria-label={`${combatants[activeActor].name}の特技`}>
            <button
              type="button"
              disabled={commandsLocked || activeUnit.vitality < activeSkill.vitalityCost}
              onClick={() => {
                if (activeActor === 'sumiwatari') {
                  setTargetMode('clarifying-flow')
                  return
                }
                void setPlan(activeActor, fixedSkillPlan(battle, activeActor))
              }}
            >
              <strong>{activeSkill.name}</strong>
              <span>{
                activeActor === 'tomoshigoke'
                  ? '野生スミワタリを鎮め、警戒度を下げる'
                  : activeActor === 'numakuguri'
                    ? `${combatants[fixedSkillPlan(battle, activeActor).targetId as AllyCombatantId].name}への攻撃を引き受ける`
                    : '対象の汚染を除去する'
              }</span>
              <small>活性{activeSkill.vitalityCost}</small>
            </button>
          </div>
        )}

        {targetMode === 'clarifying-flow' && activeActor === 'sumiwatari' && (
          <div className="waterway-target-picker" aria-label="澄み流しの対象">
            <small>澄み流しの対象</small>
            {clarifyingTargets.map((target) => (
              <button
                key={target.id}
                type="button"
                className={
                  (guidance.step === 1 && target.id === 'pollution-mass') ||
                  (guidance.step === 2 && target.id === 'polluted-sumiwatari')
                    ? 'is-recommended'
                    : undefined
                }
                disabled={
                  commandsLocked ||
                  target.clean ||
                  activeUnit.vitality < activeSkill.vitalityCost
                }
                onClick={() => void setPlan('sumiwatari', {
                  kind: 'skill',
                  skillId: 'clarifying-flow',
                  targetId: target.id,
                })}
              >
                <strong>{target.name}</strong><span>{target.detail}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="tower-plan-summary" aria-label="このラウンドの予定">
        {allyIds.map((actorId) => (
          <p key={actorId}>
            <span>{combatants[actorId].name}</span>
            <strong>{planLabel(battle.plans[actorId])}</strong>
          </p>
        ))}
      </div>

      <details className="tower-strategy-hint">
        <summary>作戦ヒントを見る</summary>
        <strong>{guidance.objective}</strong>
        <ul>{guidance.planLines.map((line) => <li key={line}>{line}</li>)}</ul>
        <div>{guidance.forecast.map((line) => <span key={line}>✓ {line}</span>)}</div>
      </details>

      <button
        className="primary-button full-button tower-resolve-button"
        type="button"
        disabled={
          (battle.phase === 'planning' && !canCommitWaterwayRound(battle)) ||
          (battle.phase === 'committed' && saveStatus !== 'saved')
        }
        onClick={() => void commitOrResolve()}
      >
        {battle.phase === 'committed' ? '保存した作戦を実行する' : '3体の行動を開始する'}
      </button>

      <details className="battle-log-details tower-log-details">
        <summary>詳しい記録</summary>
        <div className="battle-log" aria-live="polite">
          <ul>{battle.lastLog.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </details>
    </section>
  )
}
