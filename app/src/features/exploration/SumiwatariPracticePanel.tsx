import { useState } from 'react'
import { useGameSession } from '../../app/GameSessionContext'
import {
  canResolveSumiPracticeRound,
  canSetSumiPracticePlan,
} from '../../domain/exploration/sumiPracticeBattle'
import type {
  ExplorationAction,
  SumiPracticeAllyId,
  SumiPracticePlan,
} from '../../domain/exploration/types'
import { BattleCommandMenu } from './BattleCommandMenu'
import { BattleImpactStrip } from './BattleImpactStrip'
import { BattleValueBar } from './BattleValueBar'
import { AllyStateBadge } from './AllyStateBadge'
import { EnemyIntentCue } from './EnemyIntentCue'
import { practiceEnemyIntent } from './enemyIntent'
import { DefenseCoverageCue } from './DefenseCoverageCue'
import { singleTargetCoverage } from './defenseCoverage'

const allyInfo = {
  tomoshigoke: {
    name: 'トモシゴケ',
    role: '回復・鎮静',
    skill: { plan: 'moss-droplet', name: '灯苔の雫', effect: '傷ついた味方を24回復', cost: 25 },
  },
  numakuguri: {
    name: 'ヌマクグリ',
    role: '防御・かばう',
    skill: { plan: 'burrow-guard', name: '身代わり潜行', effect: '仲間への攻撃をかばう', cost: 20 },
  },
  sumiwatari: {
    name: 'スミワタリ',
    role: '浄化・回復',
    skill: { plan: 'clarifying-flow', name: '澄み流し', effect: '汚染解除＋小回復', cost: 25 },
  },
} as const

const planNames: Record<SumiPracticePlan, string> = {
  attack: 'たたかう',
  defend: '防御',
  'moss-droplet': '灯苔の雫',
  'burrow-guard': '身代わり潜行',
  'clarifying-flow': '澄み流し',
}

const actorOrder: SumiPracticeAllyId[] = ['sumiwatari', 'tomoshigoke', 'numakuguri']

function practicePlanLabel(actorId: SumiPracticeAllyId, plan: SumiPracticePlan | null): string {
  if (!plan) return '未選択'
  if (actorId === 'numakuguri' && plan === 'burrow-guard') {
    return '身代わり潜行 → スミワタリ'
  }
  return planNames[plan]
}

export function SumiwatariPracticePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state } = useGameSession()
  const [activeActor, setActiveActor] = useState<SumiPracticeAllyId>('sumiwatari')
  const [skillOpen, setSkillOpen] = useState(true)
  const battle = state?.expedition.battle
  if (!battle || !('kind' in battle) || battle.kind !== 'sumi-practice') return null

  if (battle.outcome === 'victory') {
    return (
      <section className="sumi-practice-result field-event-card" aria-labelledby="sumi-practice-victory">
        <p className="eyebrow">前衛3体・初勝利</p>
        <h1 id="sumi-practice-victory">スミワタリの浄化が仲間を守った</h1>
        <div className="intro-victory-mark" aria-hidden="true">勝利</div>
        <ul className="intro-result-log">
          {battle.lastLog.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <section className="clarifying-flow-summary" aria-label="澄み流しの効果">
          <small>覚えた役割</small>
          <strong>澄み流し</strong>
          <span>味方の汚染を解除し、HPを少し回復する</span>
        </section>
        <button
          className="primary-button full-button"
          type="button"
          onClick={() => void runAction({ type: 'finishSumiPractice' })}
        >
          前衛3体で分岐調査へ進む
        </button>
      </section>
    )
  }

  const activeInfo = allyInfo[activeActor]
  const activeAlly = battle.allies[activeActor]
  const pollutionPresent = Object.values(battle.allies).some((ally) => ally.polluted)
  const activePlan = battle.plans[activeActor]
  const forceClarifyingFlow = activeActor === 'sumiwatari' && pollutionPresent
  const hint = pollutionPresent
    ? 'トモシゴケが汚染中。スミワタリの「特技」から澄み流しを使います。'
    : '汚染は解除されました。3体の攻撃でキリハネを退かせます。'
  const intentTargetId: SumiPracticeAllyId = battle.round % 2 === 1
    ? 'sumiwatari'
    : 'numakuguri'
  const defenseCoverage = singleTargetCoverage({
    targetName: allyInfo[intentTargetId].name,
    targetDefending: battle.plans[intentTargetId] === 'defend',
    protectorPlanned: battle.plans.numakuguri === 'burrow-guard',
    protectedTargetName: 'スミワタリ',
    plansComplete: Object.values(battle.plans).every((plan) => plan !== null),
    mismatchedProtectionMitigates: intentTargetId === 'numakuguri',
  })

  async function choosePlan(actorId: SumiPracticeAllyId, plan: SumiPracticePlan) {
    const changed = await runAction({ type: 'setSumiPracticePlan', actorId, plan })
    if (!changed) return
    setSkillOpen(false)
    const currentIndex = actorOrder.indexOf(actorId)
    setActiveActor(actorOrder[(currentIndex + 1) % actorOrder.length])
  }

  return (
    <section className="sumi-practice-battle" aria-labelledby="sumi-practice-title">
      <div className="sumi-practice-heading">
        <div>
          <p className="eyebrow">通常戦闘・第{battle.round}ラウンド</p>
          <h1 id="sumi-practice-title">汚染をまとったキリハネ</h1>
        </div>
        <div className="specimen-orb polluted" aria-hidden="true">濁</div>
      </div>

      <section className="practice-purpose">
        <small>加入した特技を試す</small>
        <strong>澄み流しで仲間の汚染を解除する</strong>
        <span>解除後は3体で通常どおり戦えます。</span>
      </section>

      <div className="normal-enemy-status">
        <span>HP</span>
        <BattleValueBar value={battle.enemyHp} max={battle.enemyMaxHp} label="汚染をまとったキリハネのHP" />
        <strong>{battle.enemyHp}/{battle.enemyMaxHp}</strong>
      </div>

      <EnemyIntentCue intent={practiceEnemyIntent(battle.round)} />

      {battle.round > 1 && (
        <section className="normal-battle-result">
          <small>前のラウンド</small>
          <BattleImpactStrip lines={battle.lastLog} sequence={battle.round} status="行動結果を更新" />
          <details className="normal-result-details">
            <summary>詳しい結果</summary>
            <ul>{battle.lastLog.map((line) => <li key={line}>{line}</li>)}</ul>
          </details>
        </section>
      )}

      <p className="battle-tutorial-hint">{hint}</p>

      <div className="practice-ally-tabs" role="tablist" aria-label="前衛3体">
        {actorOrder.map((actorId) => {
          const ally = battle.allies[actorId]
          const plan = battle.plans[actorId]
          return (
            <button
              key={actorId}
              type="button"
              role="tab"
              aria-selected={activeActor === actorId}
              className={`${activeActor === actorId ? 'is-active' : ''} ${ally.polluted ? 'is-polluted' : ''}`}
              onClick={() => {
                setActiveActor(actorId)
                setSkillOpen(actorId === 'sumiwatari' && ally.polluted)
              }}
            >
              <strong>{allyInfo[actorId].name}</strong>
              <span className="ally-tab-hp">
                HP {ally.currentHp}/{ally.maxHp}
                <BattleValueBar
                  value={ally.currentHp}
                  max={ally.maxHp}
                  label={`${allyInfo[actorId].name}のHP`}
                  compact
                  decorative
                />
              </span>
              {ally.polluted ? (
                <AllyStateBadge tone="pollution">汚染</AllyStateBadge>
              ) : plan === 'defend' ? (
                <AllyStateBadge tone="guard">防御予定</AllyStateBadge>
              ) : actorId === 'numakuguri' && plan === 'burrow-guard' ? (
                <AllyStateBadge tone="protect">スミワタリを守る</AllyStateBadge>
              ) : (
                <small>{plan ? `予定：${planNames[plan]}` : allyInfo[actorId].role}</small>
              )}
            </button>
          )
        })}
      </div>

      <section className="practice-active-command" aria-label={`${activeInfo.name}の状態と行動`}>
        <div className="active-ally-status">
          <div><span>{activeInfo.name}</span><strong>{activeInfo.role}</strong></div>
          <p><span>HP {activeAlly.currentHp}/{activeAlly.maxHp}</span><span>活性 {activeAlly.vitality}/100</span></p>
        </div>
        <BattleCommandMenu
          actorName={activeInfo.name}
          skillOpen={skillOpen}
          selectedAction={
            activePlan === 'attack'
              ? 'attack'
              : activePlan === 'defend'
                ? 'defend'
                : activePlan
                  ? 'skill'
                  : undefined
          }
          focusAction={skillOpen ? 'skill' : undefined}
          attackDisabled={forceClarifyingFlow}
          attackHint={forceClarifyingFlow ? '先に仲間を浄化' : '攻撃・活性＋20'}
          defendDisabled={forceClarifyingFlow}
          defendHint={forceClarifyingFlow ? '先に仲間を浄化' : '被害軽減・活性＋25'}
          onAttack={() => void choosePlan(activeActor, 'attack')}
          onToggleSkills={() => setSkillOpen((open) => !open)}
          onDefend={() => void choosePlan(activeActor, 'defend')}
        />
        {skillOpen && (
          <div className="practice-skill-list" aria-label={`${activeInfo.name}の特技`}>
            <button
              type="button"
              disabled={!canSetSumiPracticePlan(
                battle,
                activeActor,
                activeInfo.skill.plan as SumiPracticePlan,
              )}
              onClick={() => void choosePlan(
                activeActor,
                activeInfo.skill.plan as SumiPracticePlan,
              )}
            >
              <strong>{activeInfo.skill.name}</strong>
              <span>{activeInfo.skill.plan === 'burrow-guard'
                ? 'スミワタリへの攻撃を引き受ける'
                : activeInfo.skill.effect}</span>
              <small>活性{activeInfo.skill.cost}</small>
            </button>
          </div>
        )}
        {activePlan && <p className="selected-practice-plan">予定：{planNames[activePlan]}</p>}
      </section>

      <div className="practice-plan-summary" aria-label="このラウンドの予定">
        {actorOrder.map((actorId) => (
          <p key={actorId}>
            <span>{allyInfo[actorId].name}</span>
            <strong>{practicePlanLabel(actorId, battle.plans[actorId])}</strong>
          </p>
        ))}
      </div>

      <DefenseCoverageCue
        coverage={defenseCoverage}
        recommendation={
          defenseCoverage.status === 'partial' || defenseCoverage.status === 'mismatch'
            ? pollutionPresent
              ? 'スミワタリ：澄み流し'
              : `${allyInfo[intentTargetId].name}：防御`
            : undefined
        }
        onRecommendation={() => {
          setActiveActor(pollutionPresent ? 'sumiwatari' : intentTargetId)
          setSkillOpen(pollutionPresent)
        }}
      />

      <button
        className="primary-button full-button practice-resolve-button"
        type="button"
        disabled={!canResolveSumiPracticeRound(battle)}
        onClick={() => void runAction({ type: 'resolveSumiPracticeRound' })}
      >
        3体の行動を開始する
      </button>
    </section>
  )
}
