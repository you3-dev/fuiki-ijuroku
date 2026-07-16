import { useEffect, useState } from 'react'
import { allyIds, combatants, skillDefinitions } from '../../domain/battle/data'
import {
  canCommitTowerRound,
  canRequestTowerCooperation,
} from '../../domain/battle/towerBattle'
import type {
  AllyCombatantId,
  PlannedAction,
  ProtagonistSupport,
  TowerBattleState,
} from '../../domain/battle/types'
import type { ExplorationAction } from '../../domain/exploration/types'
import { useGameSession } from '../../app/GameSessionContext'
import { BattleCommandMenu } from './BattleCommandMenu'
import { BattleImpactStrip } from './BattleImpactStrip'
import { BattleValueBar } from './BattleValueBar'

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

type TowerGuidance = {
  step: 1 | 2 | 3
  objective: string
  explanation: string
  planLines: string[]
  forecast: string[]
}

function guidanceFor(battle: TowerBattleState): TowerGuidance {
  if (!battle.callObserved && battle.mistTurns === 0) {
    return {
      step: 1,
      objective: '霧が戻るまで調査隊を守る',
      explanation: '霧が晴れている間は鳴き声を記録できません。次の霧に備えます。',
      planLines: ['主人公：支援なし', '前衛3体：防御'],
      forecast: ['被害を軽減', '活性を蓄える', '次ラウンドに霧が戻る'],
    }
  }

  if (!battle.callObserved) {
    return {
      step: 1,
      objective: '霧の中の鳴き声を記録する',
      explanation: '主人公が観察し、前衛は攻撃音を立てずに身を守ります。',
      planLines: ['主人公：霧中の鳴き声を観察', '前衛3体：防御'],
      forecast: ['鳴き声を記録', '警戒度－10', '被害を軽減'],
    }
  }

  if (
    !canRequestTowerCooperation(battle) &&
    battle.combatants.tomoshigoke.vitality <
      skillDefinitions['calming-glimmer'].vitalityCost
  ) {
    return {
      step: 2,
      objective: 'トモシゴケの活性を蓄える',
      explanation: '静かな明滅に必要な活性が足りません。防御して整えます。',
      planLines: ['主人公：支援なし', '前衛3体：防御'],
      forecast: ['被害を軽減', 'トモシゴケの活性＋25'],
    }
  }

  if (!canRequestTowerCooperation(battle)) {
    return {
      step: 2,
      objective: '同じ周期を返して鎮める',
      explanation: '主人公が記録した周期を返し、トモシゴケが光で敵意のなさを伝えます。',
      planLines: [
        '主人公：鎮静音具で周期を返す',
        'トモシゴケ：静かな明滅',
        'ヌマクグリ・スミワタリ：防御',
      ],
      forecast: ['周期応答を記録', '鎮静を付与', '警戒度－40'],
    }
  }

  return {
    step: 3,
    objective: 'キリハネへ協力を求める',
    explanation: '条件が整いました。主人公の調査から協力要請を選びます。',
    planLines: ['主人公：協力要請', '前衛3体：防御'],
    forecast: ['協力要請は必ず成功', 'キリハネが控えへ加入'],
  }
}

function summarizeRound(battle: TowerBattleState): string[] {
  if (battle.round === 1 && !battle.callObserved) return []
  const priorities = [
    '周期を記録',
    '鎮静音具',
    '静かな明滅',
    '霧包み',
    '霧裂き',
    '翅刃',
    '生態被害',
  ]
  const selected = priorities.flatMap((keyword) =>
    battle.lastLog.filter((line) => line.includes(keyword)),
  )
  return [...new Set(selected)].slice(0, 3)
}

function skillPlanFor(
  battle: TowerBattleState,
  actorId: AllyCombatantId,
): PlannedAction {
  const skillId = allySkill[actorId]
  if (skillId === 'calming-glimmer') {
    return { kind: 'skill', skillId, targetId: 'kirihane' }
  }
  if (skillId === 'burrow-guard') {
    const targetId = battle.combatants.tomoshigoke.currentHp > 0
      ? 'tomoshigoke'
      : 'sumiwatari'
    return { kind: 'skill', skillId, targetId }
  }
  const targetId = allyIds.reduce((lowest, candidate) =>
    battle.combatants[candidate].currentHp / combatants[candidate].maxHp <
    battle.combatants[lowest].currentHp / combatants[lowest].maxHp
      ? candidate
      : lowest,
  )
  return { kind: 'skill', skillId, targetId }
}

export function TowerBattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state, saveStatus } = useGameSession()
  const [activeActor, setActiveActor] = useState<AllyCombatantId>('tomoshigoke')
  const [skillOpen, setSkillOpen] = useState(false)
  const [researchOpen, setResearchOpen] = useState(true)
  const battle = state?.expedition.towerBattle
  const callObserved = battle?.callObserved ?? false
  const cooperationAvailable = battle ? canRequestTowerCooperation(battle) : false

  useEffect(() => {
    if (callObserved && !cooperationAvailable) {
      setActiveActor('tomoshigoke')
      setSkillOpen(true)
      setResearchOpen(true)
    } else if (cooperationAvailable) {
      setResearchOpen(true)
      setSkillOpen(false)
    }
  }, [callObserved, cooperationAvailable])

  if (!state || !battle) return null
  const currentBattle = battle

  async function setPlan(actorId: AllyCombatantId, plan: PlannedAction) {
    const changed = await runAction({
      type: 'towerBattleCommand',
      command: { type: 'setPlan', actorId, plan },
    })
    if (!changed) return
    setSkillOpen(false)
    const index = allyIds.indexOf(actorId)
    setActiveActor(allyIds[(index + 1) % allyIds.length])
  }

  async function setSupport(support: ProtagonistSupport) {
    const changed = await runAction({
      type: 'towerBattleCommand',
      command: { type: 'setSupport', support },
    })
    if (changed) setResearchOpen(false)
  }

  async function commitOrResolve() {
    if (currentBattle.phase === 'committed') {
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
        <p>報酬や地域進行は加算されていません。遭遇直前から再試行できます。</p>
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
  const guidance = guidanceFor(battle)
  const resultSummary = summarizeRound(battle)
  const activeUnit = battle.combatants[activeActor]
  const activeSkill = skillDefinitions[allySkill[activeActor]]
  const commandsLocked = battle.phase === 'committed' || activeUnit.currentHp <= 0

  return (
    <section className="tower-command-battle" aria-labelledby="tower-battle-title">
      <div className="standard-battle-heading">
        <div>
          <p className="eyebrow">接触調査・第{battle.round}ラウンド</p>
          <h1 id="tower-battle-title">霧中のキリハネ</h1>
        </div>
        <div className="specimen-orb misted" aria-hidden="true">霧</div>
      </div>

      <section className="tower-current-objective" aria-label="今回の目的">
        <small>今回の目的 {guidance.step}/3</small>
        <strong>{guidance.objective}</strong>
        <span>{guidance.explanation}</span>
      </section>

      <div className="tower-enemy-status">
        <div><span>HP</span><strong>{battle.combatants.kirihane.currentHp}/{combatants.kirihane.maxHp}</strong></div>
        <div><span>警戒度</span><strong>{battle.vigilance}</strong></div>
        <div><span>霧</span><strong>残り{battle.mistTurns}R</strong></div>
      </div>
      <div className="tower-enemy-health-bar">
        <BattleValueBar
          value={battle.combatants.kirihane.currentHp}
          max={combatants.kirihane.maxHp}
          label="霧中のキリハネのHP"
          compact
        />
      </div>
      <p className="tower-risk-note">倒してしまうと協力を求められません。攻撃は警戒度も上げます。</p>

      <div className="tower-command-conditions" aria-label="協力条件">
        <span className={battle.callObserved ? 'is-met' : ''}>鳴き声{battle.callObserved ? ' ✓' : ''}</span>
        <span className={battle.echoedCall ? 'is-met' : ''}>周期応答{battle.echoedCall ? ' ✓' : ''}</span>
        <span className={battle.calmed ? 'is-met' : ''}>鎮静{battle.calmed ? ' ✓' : ''}</span>
        <span className={battle.vigilance <= 20 ? 'is-met' : ''}>警戒20以下{battle.vigilance <= 20 ? ' ✓' : ''}</span>
      </div>

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
          <small>
            {battle.supportPlan === 'none'
              ? '観察・鎮静音具・協力要請'
              : `選択中：${{
                  'observe-call': '鳴き声を観察',
                  'calming-chime': '鎮静音具',
                  'request-cooperation': '協力要請',
                }[battle.supportPlan]}`}
          </small>
        </button>
        {researchOpen && (
          <div className="tower-research-actions">
            <button
              type="button"
              className={battle.supportPlan === 'observe-call' ? 'is-selected' : undefined}
              disabled={battle.callObserved || battle.mistTurns === 0}
              onClick={() => void setSupport('observe-call')}
            >
              <strong>鳴き声を観察</strong><span>霧中で前衛全員が防御すると成功</span>
            </button>
            <button
              type="button"
              className={battle.supportPlan === 'calming-chime' ? 'is-selected' : undefined}
              disabled={!battle.callObserved || battle.echoedCall}
              onClick={() => void setSupport('calming-chime')}
            >
              <strong>鎮静音具</strong><span>記録した周期を返す</span>
            </button>
            <button
              type="button"
              className={battle.supportPlan === 'request-cooperation' ? 'is-selected' : undefined}
              disabled={!cooperationReady || !hasKirihaneCapacity}
              onClick={() => void setSupport('request-cooperation')}
            >
              <strong>協力要請</strong><span>{cooperationReady ? '条件達成・必ず成功' : '条件達成後に使用'}</span>
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
          const unit = battle.combatants[actorId]
          return (
            <button
              key={actorId}
              type="button"
              role="tab"
              aria-selected={activeActor === actorId}
              className={activeActor === actorId ? 'is-active' : undefined}
              onClick={() => {
                setActiveActor(actorId)
                setSkillOpen(false)
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
              <small>予定：{planNames[battle.plans[actorId].kind]}</small>
            </button>
          )
        })}
      </div>

      <section className="tower-active-command" aria-label={`${combatants[activeActor].name}の状態と行動`}>
        <div className="active-ally-status">
          <div><span>{combatants[activeActor].name}</span><strong>{allyRole[activeActor]}</strong></div>
          <p><span>HP {activeUnit.currentHp}/{combatants[activeActor].maxHp}</span><span>活性 {activeUnit.vitality}/100</span></p>
        </div>
        <BattleCommandMenu
          actorName={combatants[activeActor].name}
          skillOpen={skillOpen}
          selectedAction={
            battle.plans[activeActor].kind === 'basic'
              ? 'attack'
              : battle.plans[activeActor].kind
          }
          focusAction={skillOpen ? 'skill' : undefined}
          attackDisabled={commandsLocked}
          attackHint="攻撃・警戒＋10・活性＋20"
          skillDisabled={commandsLocked}
          defendDisabled={commandsLocked}
          onAttack={() => void setPlan(activeActor, { kind: 'basic', targetId: 'kirihane' })}
          onToggleSkills={() => setSkillOpen((open) => !open)}
          onDefend={() => void setPlan(activeActor, { kind: 'defend', targetId: activeActor })}
        />
        {skillOpen && (
          <div className="tower-skill-list" aria-label={`${combatants[activeActor].name}の特技`}>
            <button
              type="button"
              disabled={commandsLocked || activeUnit.vitality < activeSkill.vitalityCost}
              onClick={() => void setPlan(activeActor, skillPlanFor(battle, activeActor))}
            >
              <strong>{activeSkill.name}</strong>
              <span>{
                activeActor === 'tomoshigoke'
                  ? 'キリハネを鎮め、警戒度を下げる'
                  : activeActor === 'numakuguri'
                    ? '傷ついた仲間をかばう'
                    : '傷ついた仲間を小回復'
              }</span>
              <small>活性{activeSkill.vitalityCost}</small>
            </button>
          </div>
        )}
      </section>

      <div className="tower-plan-summary" aria-label="このラウンドの予定">
        {allyIds.map((actorId) => (
          <p key={actorId}>
            <span>{combatants[actorId].name}</span>
            <strong>{
              battle.plans[actorId].kind === 'skill'
                ? skillDefinitions[battle.plans[actorId].skillId].name
                : planNames[battle.plans[actorId].kind]
            }</strong>
          </p>
        ))}
      </div>

      <details className="tower-strategy-hint">
        <summary>作戦ヒントを見る</summary>
        <strong>{guidance.objective}</strong>
        <ul>{guidance.planLines.map((line) => <li key={line}>{line}</li>)}</ul>
        <div>{guidance.forecast.map((line) => <span key={line}>✓ {line}</span>)}</div>
      </details>

      {battle.supportPlan === 'request-cooperation' && !hasKirihaneCapacity && (
        <p className="plan-warning">控えに空きがないため、キリハネを迎えられません。</p>
      )}

      <button
        className="primary-button full-button tower-resolve-button"
        type="button"
        disabled={
          (battle.phase === 'planning' && !canCommitTowerRound(battle)) ||
          (battle.phase === 'committed' && saveStatus !== 'saved') ||
          (battle.supportPlan === 'request-cooperation' && !hasKirihaneCapacity)
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
