import { useState } from 'react'
import { useGameSession } from '../../app/GameSessionContext'
import { canResolveIntroBattleRound, canSetIntroBattlePlan } from '../../domain/exploration/introBattle'
import type {
  ExplorationAction,
  IntroBattleAllyId,
  IntroBattlePlan,
} from '../../domain/exploration/types'
import { BattleCommandMenu } from './BattleCommandMenu'

const allyInfo = {
  tomoshigoke: {
    name: 'トモシゴケ',
    role: '回復役',
    attack: '灯角突き',
    skills: [
      { plan: 'moss-droplet', name: '灯苔の雫', effect: '傷ついた味方を24回復', cost: 25 },
      { plan: 'calming-glimmer', name: '静かな明滅', effect: '敵の攻撃を弱める', cost: 20 },
    ],
  },
  numakuguri: {
    name: 'ヌマクグリ',
    role: '防御役',
    attack: '大尾打ち',
    skills: [
      { plan: 'burrow-guard', name: '身代わり潜行', effect: '仲間への攻撃をかばう', cost: 20 },
      { plan: 'mud-screen', name: '泥幕', effect: '敵の攻撃を弱める', cost: 25 },
    ],
  },
} as const

const planNames: Record<IntroBattlePlan, string> = {
  attack: 'たたかう',
  defend: '防御',
  'moss-droplet': '灯苔の雫',
  'calming-glimmer': '静かな明滅',
  'burrow-guard': '身代わり潜行',
  'mud-screen': '泥幕',
}

export function IntroBattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state } = useGameSession()
  const [activeActor, setActiveActor] = useState<IntroBattleAllyId>('tomoshigoke')
  const [skillOpen, setSkillOpen] = useState(false)
  const battle = state?.expedition.battle
  if (!battle || !('kind' in battle) || battle.kind !== 'intro-normal') return null

  if (battle.outcome === 'victory') {
    return (
      <section className="intro-battle-result field-event-card" aria-labelledby="intro-victory-title">
        <p className="eyebrow">通常戦闘・勝利</p>
        <h1 id="intro-victory-title">若いキリハネは霧の奥へ退いた</h1>
        <div className="intro-victory-mark" aria-hidden="true">勝利</div>
        <ul className="intro-result-log">
          {battle.lastLog.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <section className="battle-learning-summary" aria-label="この戦闘で分かったこと">
          <small>この戦闘で分かったこと</small>
          <p><strong>トモシゴケ</strong><span>攻撃と回復ができる</span></p>
          <p><strong>ヌマクグリ</strong><span>防御とかばうが得意</span></p>
        </section>
        <button
          className="primary-button full-button"
          type="button"
          onClick={() => void runAction({ type: 'finishIntroBattle' })}
        >
          異常反応を追う
        </button>
      </section>
    )
  }

  const info = allyInfo[activeActor]
  const ally = battle.allies[activeActor]
  const allHealthy = Object.values(battle.allies).every(
    (member) => member.currentHp >= member.maxHp,
  )
  const tutorialHint =
    battle.round === 1 && battle.plans.tomoshigoke === null
      ? 'トモシゴケを選択中。「たたかう」で基礎攻撃を試せます。'
      : battle.round === 1 && battle.plans.numakuguri === null
        ? '次はヌマクグリ。「防御」で被害を減らせます。'
        : battle.allies.tomoshigoke.currentHp < battle.allies.tomoshigoke.maxHp &&
            battle.plans.tomoshigoke === null
          ? 'トモシゴケの「特技」には、HPを回復する灯苔の雫があります。'
          : '役割と残りHPを見て、2体の行動を決めます。'

  async function choosePlan(actorId: IntroBattleAllyId, plan: IntroBattlePlan) {
    const changed = await runAction({ type: 'setIntroBattlePlan', actorId, plan })
    if (!changed) return
    setSkillOpen(false)
    setActiveActor(actorId === 'tomoshigoke' ? 'numakuguri' : 'tomoshigoke')
  }

  return (
    <section className="intro-normal-battle" aria-labelledby="intro-battle-title">
      <div className="intro-battle-heading">
        <div>
          <p className="eyebrow">通常戦闘・第{battle.round}ラウンド</p>
          <h1 id="intro-battle-title">若いキリハネ</h1>
        </div>
        <div className="specimen-orb misted" aria-hidden="true">翅</div>
      </div>

      <section className="normal-battle-goal">
        <small>勝利条件</small>
        <strong>HPを0にして退かせる</strong>
        <span>通常戦闘では、観察しなくても勝利できます。</span>
      </section>

      <div className="normal-enemy-status">
        <span>HP</span>
        <div><i style={{ width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%` }} /></div>
        <strong>{battle.enemyHp}/{battle.enemyMaxHp}</strong>
      </div>

      {battle.round > 1 && (
        <section className="normal-battle-result" aria-live="polite">
          <small>前のラウンド</small>
          <ul>{battle.lastLog.map((line) => <li key={line}>{line}</li>)}</ul>
        </section>
      )}

      <p className="battle-tutorial-hint">{tutorialHint}</p>

      <div className="intro-ally-tabs" role="tablist" aria-label="行動する仲間">
        {(Object.keys(allyInfo) as IntroBattleAllyId[]).map((actorId) => {
          const member = battle.allies[actorId]
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
              <strong>{allyInfo[actorId].name}</strong>
              <span>HP {member.currentHp}/{member.maxHp}</span>
              <small>{battle.plans[actorId] ? `予定：${planNames[battle.plans[actorId]]}` : allyInfo[actorId].role}</small>
            </button>
          )
        })}
      </div>

      <section className="active-ally-command" aria-label={`${info.name}の状態と行動`}>
        <div className="active-ally-status">
          <div><span>{info.name}</span><strong>{info.role}</strong></div>
          <p><span>HP {ally.currentHp}/{ally.maxHp}</span><span>活性 {ally.vitality}/100</span></p>
        </div>
        <BattleCommandMenu
          actorName={info.name}
          skillOpen={skillOpen}
          selectedAction={
            battle.plans[activeActor] === 'attack'
              ? 'attack'
              : battle.plans[activeActor] === 'defend'
                ? 'defend'
                : battle.plans[activeActor]
                  ? 'skill'
                  : undefined
          }
          focusAction={skillOpen ? 'skill' : undefined}
          onAttack={() => void choosePlan(activeActor, 'attack')}
          onToggleSkills={() => setSkillOpen((open) => !open)}
          onDefend={() => void choosePlan(activeActor, 'defend')}
        />
        {skillOpen && (
          <div className="intro-skill-list" aria-label={`${info.name}の特技`}>
            {info.skills.map((skill) => {
              const plan = skill.plan as IntroBattlePlan
              const unavailable =
                !canSetIntroBattlePlan(battle, activeActor, plan) ||
                (plan === 'moss-droplet' && allHealthy)
              return (
                <button
                  key={skill.plan}
                  type="button"
                  disabled={unavailable}
                  onClick={() => void choosePlan(activeActor, plan)}
                >
                  <strong>{skill.name}</strong>
                  <span>{skill.effect}</span>
                  <small>活性{skill.cost}</small>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <div className="intro-plan-summary" aria-label="このラウンドの予定">
        {(Object.keys(allyInfo) as IntroBattleAllyId[]).map((actorId) => (
          <p key={actorId}>
            <span>{allyInfo[actorId].name}</span>
            <strong>{battle.plans[actorId] ? planNames[battle.plans[actorId]] : '未選択'}</strong>
          </p>
        ))}
      </div>

      <button
        className="primary-button full-button"
        type="button"
        disabled={!canResolveIntroBattleRound(battle)}
        onClick={() => void runAction({ type: 'resolveIntroBattleRound' })}
      >
        2体の行動を開始する
      </button>
    </section>
  )
}
