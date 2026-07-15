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

const allySkill = {
  tomoshigoke: 'calming-glimmer',
  numakuguri: 'burrow-guard',
  sumiwatari: 'clarifying-flow',
} as const

type TowerGuidance = {
  step: 1 | 2 | 3
  objective: string
  explanation: string
  support: ProtagonistSupport
  plans: Record<AllyCombatantId, PlannedAction>
  planLines: string[]
  forecast: string[]
  primaryLabel: string
}

function allDefendPlans(): Record<AllyCombatantId, PlannedAction> {
  return {
    tomoshigoke: { kind: 'defend', targetId: 'tomoshigoke' },
    numakuguri: { kind: 'defend', targetId: 'numakuguri' },
    sumiwatari: { kind: 'defend', targetId: 'sumiwatari' },
  }
}

function guidanceFor(battle: TowerBattleState): TowerGuidance {
  if (!battle.callObserved && battle.mistTurns === 0) {
    return {
      step: 1,
      objective: '霧が戻るまで調査隊を守る',
      explanation: '霧が晴れている間は鳴き声を記録できません。次の霧に備えます。',
      support: 'none',
      plans: allDefendPlans(),
      planLines: ['主人公：周囲を警戒', '前衛3体：全員防御'],
      forecast: ['受ける被害を軽減', '活性を蓄える', '次ラウンドに霧が戻る'],
      primaryLabel: '全員で身を守る',
    }
  }

  if (!battle.callObserved) {
    return {
      step: 1,
      objective: '霧の中の鳴き声を記録する',
      explanation: '攻撃音を立てず、短い鳴き声の周期を聞き取ります。',
      support: 'observe-call',
      plans: allDefendPlans(),
      planLines: ['主人公：霧中の鳴き声を観察', '前衛3体：全員防御'],
      forecast: ['鳴き声の観察に成功', '警戒度－10', '受ける被害を軽減'],
      primaryLabel: 'この作戦で観察する',
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
      explanation: '静かな明滅に必要な活性が足りません。全員で身を守りながら整えます。',
      support: 'none',
      plans: allDefendPlans(),
      planLines: ['主人公：周囲を警戒', '前衛3体：全員防御'],
      forecast: ['受ける被害を軽減', 'トモシゴケの活性＋25', '次ラウンドに応答可能'],
      primaryLabel: '防御して活性を蓄える',
    }
  }

  if (!canRequestTowerCooperation(battle)) {
    return {
      step: 2,
      objective: '同じ周期を返して鎮める',
      explanation: '記録した周期とトモシゴケの光で、敵意がないことを伝えます。',
      support: 'calming-chime',
      plans: {
        tomoshigoke: {
          kind: 'skill',
          skillId: 'calming-glimmer',
          targetId: 'kirihane',
        },
        numakuguri: { kind: 'defend', targetId: 'numakuguri' },
        sumiwatari: { kind: 'defend', targetId: 'sumiwatari' },
      },
      planLines: [
        '主人公：鎮静音具で周期を返す',
        'トモシゴケ：静かな明滅',
        'ヌマクグリ・スミワタリ：防御',
      ],
      forecast: ['周期応答を記録', '鎮静を付与', '警戒度－40'],
      primaryLabel: '同じ周期で応答する',
    }
  }

  return {
    step: 3,
    objective: 'キリハネへ協力を求める',
    explanation: '生態条件が整いました。傷つけず、調査への協力をお願いします。',
    support: 'request-cooperation',
    plans: allDefendPlans(),
    planLines: ['主人公：協力要請', '前衛：敵意を見せず待機'],
    forecast: ['条件達成済み', '協力要請は必ず成功', 'キリハネが控えへ加入'],
    primaryLabel: 'キリハネへ協力を求める',
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
  const currentBattle = battle

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
  const guidance = guidanceFor(battle)
  const resultSummary = summarizeRound(battle)
  const recommendedBlocked =
    guidance.support === 'request-cooperation' && !hasKirihaneCapacity

  async function runRecommendedPlan() {
    if (currentBattle.phase === 'committed') {
      await commitOrResolve(true)
      return
    }
    const committed = await runAction({
      type: 'towerBattleCommand',
      command: {
        type: 'commitRoundWithPlan',
        support: guidance.support,
        plans: guidance.plans,
      },
    })
    if (committed) {
      await runAction({
        type: 'towerBattleCommand',
        command: { type: 'resolveRound' },
      })
    }
  }

  return (
    <section className="standard-battle" aria-labelledby="tower-battle-title">
      <div className="standard-battle-heading">
        <div>
          <p className="eyebrow">接触調査・第{battle.round}ラウンド</p>
          <h1 id="tower-battle-title">霧中のキリハネ</h1>
        </div>
        <div className="specimen-orb misted" aria-hidden="true">霧</div>
      </div>

      <section className="battle-objective-card" aria-label="今回の目的">
        <span>{guidance.step}/3</span>
        <div>
          <small>今回の目的</small>
          <strong>{guidance.objective}</strong>
          <p>{guidance.explanation}</p>
        </div>
      </section>

      <div className="enemy-status-card">
        <div><span>生態HP</span><strong>{battle.combatants.kirihane.currentHp} / {combatants.kirihane.maxHp}</strong></div>
        <div><span>警戒度</span><strong>{battle.vigilance}</strong></div>
        <div><span>霧中</span><strong>残り{battle.mistTurns}R</strong></div>
      </div>
      <p className="battle-risk-note">生態HPを0にすると倒してしまい、今回の調査は失敗します。</p>

      <div className="tower-condition-strip" aria-label="協力条件">
        <span className={battle.callObserved ? 'condition-met' : ''}>鳴き声観察</span>
        <span className={battle.echoedCall ? 'condition-met' : ''}>周期を返す</span>
        <span className={battle.calmed ? 'condition-met' : ''}>鎮静</span>
        <span className={battle.vigilance <= 20 ? 'condition-met' : ''}>警戒20以下</span>
      </div>

      {resultSummary.length > 0 && (
        <section className="battle-result-summary" aria-live="polite">
          <small>今回起きたこと</small>
          <ul>{resultSummary.map((line) => <li key={line}>{line}</li>)}</ul>
          <strong>次は「{guidance.objective}」</strong>
        </section>
      )}

      <section className="recommended-plan-card" aria-label="おすすめ作戦">
        <div className="recommended-plan-heading">
          <div>
            <small>{battle.phase === 'committed' ? '保存済みの作戦' : 'おすすめ作戦'}</small>
            <strong>{guidance.objective}</strong>
          </div>
          <span>推奨</span>
        </div>
        {battle.phase === 'committed' ? (
          <p className="saved-plan-note">端末へ保存した同じ作戦を、一度だけ安全に実行します。</p>
        ) : (
          <>
            <ul className="recommended-plan-lines">
              {guidance.planLines.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div className="plan-forecast" aria-label="作戦の見込み">
              <small>見込み</small>
              {guidance.forecast.map((line) => <span key={line}>✓ {line}</span>)}
            </div>
          </>
        )}
        {recommendedBlocked && (
          <p className="plan-warning">控えに空きがないため、キリハネを迎えられません。</p>
        )}
        <button
          className="primary-button full-button recommended-plan-button"
          type="button"
          disabled={recommendedBlocked || (battle.phase === 'committed' && saveStatus !== 'saved')}
          onClick={() => void runRecommendedPlan()}
        >
          {battle.phase === 'committed' ? '保存した作戦を実行する' : guidance.primaryLabel}
        </button>
      </section>

      <details className="advanced-battle-planner">
        <summary>個別指示を変更する</summary>
        <p>主人公と前衛3体へ別々の行動を指定します。攻撃は警戒度を上げます。</p>

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

      <details className="battle-log-details">
        <summary>詳しい記録</summary>
        <div className="battle-log" aria-live="polite">
        <ul>{battle.lastLog.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </details>

      <button
        className="secondary-button full-button battle-commit-button"
        type="button"
        disabled={
          (battle.phase === 'planning' && !canCommitTowerRound(battle)) ||
          (battle.phase === 'committed' && saveStatus !== 'saved')
        }
        onClick={() => void commitOrResolve(battle.phase === 'committed')}
      >
        {battle.phase === 'committed' ? '保存した作戦を実行する' : 'この個別作戦で進める'}
      </button>
      </details>
    </section>
  )
}
