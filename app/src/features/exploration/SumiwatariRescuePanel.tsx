import { useEffect, useState } from 'react'
import { useGameSession } from '../../app/GameSessionContext'
import { canRequestCooperation } from '../../domain/exploration/commands'
import type {
  ExplorationAction,
  TutorialBattleState,
} from '../../domain/exploration/types'
import { BattleCommandMenu } from './BattleCommandMenu'

type RescueAllyId = 'tomoshigoke' | 'numakuguri'

const allyInfo = {
  tomoshigoke: { name: 'トモシゴケ', role: '回復・鎮静' },
  numakuguri: { name: 'ヌマクグリ', role: '防御・かばう' },
} as const

const resultMessages: Record<TutorialBattleState['lastAction'], string> = {
  encountered: '黒い濁りをまとった異獣が、濾過膜を地面へ擦りつけています。',
  observed: '濾過膜の内側に汚染が詰まり、濁り水圧を放つ兆候があります。',
  defended: 'ヌマクグリが濁り水圧を受け止め、安全な処置時間を作りました。',
  cleansed: '汚染が剥がれ、スミワタリの半透明な体表が戻りました。',
  calmed: '静かな明滅に呼吸が合い、スミワタリがこちらを見ています。',
}

function currentGoal(battle: TutorialBattleState) {
  if (!battle.observed) {
    return {
      title: '苦しんでいる原因を調べる',
      hint: '主人公の「調査」から観察を選びます。',
      mode: 'research' as const,
    }
  }
  if (!battle.pressureDefended) {
    return {
      title: '濁り水圧を防いで処置時間を作る',
      hint: 'ヌマクグリの「防御」か「身代わり潜行」が有効です。',
      mode: 'numakuguri' as const,
    }
  }
  if (battle.polluted) {
    return {
      title: '濾過膜の汚染を取り除く',
      hint: '主人公の「調査」から汚染除去具を使います。',
      mode: 'research' as const,
    }
  }
  if (!battle.calmed) {
    return {
      title: '敵意がないことを光で伝える',
      hint: 'トモシゴケの「特技」から静かな明滅を使います。',
      mode: 'tomoshigoke' as const,
    }
  }
  return {
    title: 'スミワタリへ協力を求める',
    hint: '主人公の「調査」から協力要請を選べます。',
    mode: 'research' as const,
  }
}

export function SumiwatariRescuePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state } = useGameSession()
  const battle = state?.expedition.battle
  const [activeActor, setActiveActor] = useState<RescueAllyId>('tomoshigoke')
  const [skillOpen, setSkillOpen] = useState(false)
  const [researchOpen, setResearchOpen] = useState(true)
  const isRescueBattle = Boolean(battle && !('kind' in battle))
  const observed = isRescueBattle && battle && !('kind' in battle)
    ? battle.observed
    : false
  const pressureDefended = isRescueBattle && battle && !('kind' in battle)
    ? battle.pressureDefended
    : false
  const polluted = isRescueBattle && battle && !('kind' in battle)
    ? battle.polluted
    : true
  const calmed = isRescueBattle && battle && !('kind' in battle)
    ? battle.calmed
    : false

  useEffect(() => {
    if (observed && !pressureDefended) {
      setActiveActor('numakuguri')
      setSkillOpen(false)
      setResearchOpen(false)
    } else if (pressureDefended && !polluted) {
      setActiveActor('tomoshigoke')
      setSkillOpen(!calmed)
      setResearchOpen(calmed)
    } else {
      setResearchOpen(true)
    }
  }, [observed, pressureDefended, polluted, calmed])

  if (!battle || 'kind' in battle) return null

  const cooperationReady = canRequestCooperation(battle)
  const goal = currentGoal(battle)
  const info = allyInfo[activeActor]
  const canGuardPressure =
    activeActor === 'numakuguri' && battle.observed && !battle.pressureDefended
  const canCalm = activeActor === 'tomoshigoke' && !battle.polluted && !battle.calmed

  async function perform(action: Extract<ExplorationAction, { type: 'battleAction' }>['action']) {
    await runAction({ type: 'battleAction', action })
  }

  return (
    <section className="sumi-rescue-battle" aria-labelledby="rescue-title">
      <div className="rescue-battle-heading">
        <div>
          <p className="eyebrow">救助調査・第{battle.round}ラウンド</p>
          <h1 id="rescue-title">汚染されたスミワタリ</h1>
        </div>
        <div className={`specimen-orb ${battle.polluted ? 'polluted' : 'cleansed'}`} aria-hidden="true">澄</div>
      </div>

      <section className="rescue-objective" aria-label="救助調査の目的">
        <small>救助調査</small>
        <strong>汚染を除き、スミワタリを鎮める</strong>
        <span>救助対象のため「たたかう」は使いません。</span>
      </section>

      <figure className={`rescue-specimen ${battle.polluted ? 'is-polluted' : 'is-cleansed'}`}>
        <img
          src={`${import.meta.env.BASE_URL}art/${battle.polluted ? 'sumiwatari-encounter.webp' : 'sumiwatari-cleansed.webp'}`}
          alt={battle.polluted ? '黒い沈殿物に覆われ苦しむスミワタリ' : '汚染が取れ生命核の光を取り戻したスミワタリ'}
        />
        <figcaption>{battle.polluted ? '汚染・警戒中' : battle.calmed ? '浄化・鎮静済み' : '浄化済み'}</figcaption>
      </figure>

      <section className="rescue-result" role="status">
        <small>{battle.lastAction === 'encountered' ? '現在の状況' : '行動の結果'}</small>
        <p>{resultMessages[battle.lastAction]}</p>
      </section>

      <section className="rescue-next-action" aria-label="現在の目的">
        <small>現在の目的</small>
        <strong>{goal.title}</strong>
        <span>{goal.hint}</span>
      </section>

      {battle.observed && (
        <div className="rescue-condition-chips" aria-label="判明した救助条件">
          <span className={battle.pressureDefended ? 'is-met' : ''}>処置時間{battle.pressureDefended ? ' ✓' : ''}</span>
          <span className={!battle.polluted ? 'is-met' : ''}>汚染除去{!battle.polluted ? ' ✓' : ''}</span>
          <span className={battle.calmed ? 'is-met' : ''}>鎮静{battle.calmed ? ' ✓' : ''}</span>
        </div>
      )}

      <section className="research-command-panel" aria-label="主人公の調査行動">
        <button
          className={`research-command-toggle ${goal.mode === 'research' ? 'is-recommended' : ''}`}
          type="button"
          aria-expanded={researchOpen}
          onClick={() => setResearchOpen((open) => !open)}
        >
          <span aria-hidden="true">調</span>
          <strong>主人公：調査</strong>
          <small>観察・道具・協力要請</small>
        </button>
        {researchOpen && (
          <div className="research-action-list">
            <button
              type="button"
              disabled={battle.observed}
              onClick={() => void perform('observe')}
            >
              <strong>観察</strong><span>濾過膜と危険行動を調べる</span>
            </button>
            <button
              type="button"
              disabled={!battle.pressureDefended || !battle.polluted || battle.cleanserCount < 1}
              onClick={() => void perform('cleanse')}
            >
              <strong>汚染除去具</strong><span>汚染を解除　残り{battle.cleanserCount}</span>
            </button>
            <button
              type="button"
              disabled={!cooperationReady}
              onClick={() => void perform('requestCooperation')}
            >
              <strong>協力要請</strong><span>{cooperationReady ? '条件達成・必ず成功' : '救助条件の達成後に使用'}</span>
            </button>
          </div>
        )}
      </section>

      <div className="rescue-ally-tabs" role="tablist" aria-label="行動する仲間">
        {(Object.keys(allyInfo) as RescueAllyId[]).map((actorId) => (
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
            <small>{allyInfo[actorId].role}</small>
          </button>
        ))}
      </div>

      <section className="rescue-ally-command" aria-label={`${info.name}の状態と行動`}>
        <div className="rescue-ally-role"><span>{info.name}</span><strong>{info.role}</strong></div>
        <BattleCommandMenu
          actorName={info.name}
          skillOpen={skillOpen}
          attackDisabled
          attackHint="救助対象には使わない"
          defendDisabled={!canGuardPressure}
          defendHint={canGuardPressure ? '濁り水圧を防ぐ' : '今は防御不要'}
          onAttack={() => undefined}
          onToggleSkills={() => setSkillOpen((open) => !open)}
          onDefend={() => void perform('defend')}
        />
        {skillOpen && activeActor === 'tomoshigoke' && (
          <div className="rescue-skill-list" aria-label="トモシゴケの特技">
            <button type="button" disabled>
              <strong>灯苔の雫</strong><span>味方1体を回復</span><small>今は回復不要</small>
            </button>
            <button type="button" disabled={!canCalm} onClick={() => void perform('calm')}>
              <strong>静かな明滅</strong><span>スミワタリを鎮める</span><small>活性20</small>
            </button>
          </div>
        )}
        {skillOpen && activeActor === 'numakuguri' && (
          <div className="rescue-skill-list" aria-label="ヌマクグリの特技">
            <button type="button" disabled={!canGuardPressure} onClick={() => void perform('defend')}>
              <strong>身代わり潜行</strong><span>濁り水圧を受け止める</span><small>活性20</small>
            </button>
            <button type="button" disabled>
              <strong>泥幕</strong><span>敵の動きを鈍らせる</span><small>救助には不要</small>
            </button>
          </div>
        )}
      </section>

      {cooperationReady && (
        <section className="rescue-reward-preview" aria-label="協力成立後の変化">
          <small>協力成立後</small>
          <strong>スミワタリが前衛3枠目へ加入</strong>
          <span>特技「澄み流し」が使えるようになります。</span>
        </section>
      )}
    </section>
  )
}
