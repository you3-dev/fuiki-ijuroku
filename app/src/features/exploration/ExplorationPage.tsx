import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useGameSession } from '../../app/GameSessionContext'
import { canRequestCooperation } from '../../domain/exploration/commands'
import { graymossNodes } from '../../domain/exploration/data'
import type { ExplorationAction } from '../../domain/exploration/types'

const SUMIWATARI_ID = 'creature-sumiwatari-tutorial-001'

function BattlePanel({
  runAction,
}: {
  runAction: (action: ExplorationAction) => Promise<boolean>
}) {
  const { state } = useGameSession()
  const battle = state?.expedition.battle
  if (!battle) return null

  const cooperationReady = canRequestCooperation(battle)
  const messages = {
    encountered: '黒い濁りをまとった異獣が、濾過膜を地面へ擦りつけています。',
    observed: '濾過膜の内側に汚染が詰まっています。濁り水圧の予兆を確認しました。',
    defended: 'ヌマクグリが濁り水圧を受け止めました。今なら安全に処置できます。',
    cleansed: '汚染が剥がれ、半透明の体表が戻りました。警戒度が下がっています。',
    calmed: 'トモシゴケの静かな明滅に呼吸が合いました。協力を求められます。',
  } as const

  return (
    <section className="encounter-card" aria-labelledby="encounter-title">
      <div className="encounter-heading">
        <div>
          <p className="eyebrow">初回観察戦・第{battle.round}ラウンド</p>
          <h2 id="encounter-title">汚染されたスミワタリ</h2>
        </div>
        <div className={`specimen-orb ${battle.polluted ? 'polluted' : 'cleansed'}`} aria-hidden="true">
          澄
        </div>
      </div>

      <p className="encounter-message" role="status">{messages[battle.lastAction]}</p>

      <div className="battle-meters">
        <div>
          <span>警戒度</span>
          <strong>{battle.vigilance}</strong>
          <div className="meter-track"><span style={{ width: `${battle.vigilance}%` }} /></div>
        </div>
        <div>
          <span>生態状態</span>
          <strong>{battle.polluted ? '汚染' : battle.calmed ? '鎮静' : '安定化'}</strong>
        </div>
      </div>

      <div className="condition-strip" aria-label="協力条件">
        <span className={battle.observed ? 'condition-met' : ''}>観察</span>
        <span className={!battle.polluted ? 'condition-met' : ''}>汚染解除</span>
        <span className={battle.vigilance <= 20 ? 'condition-met' : ''}>警戒20以下</span>
        <span className={battle.calmed ? 'condition-met' : ''}>鎮静</span>
      </div>

      <div className="battle-actions">
        <button
          type="button"
          disabled={battle.observed}
          onClick={() => void runAction({ type: 'battleAction', action: 'observe' })}
        >
          <strong>主人公：観察</strong>
          <small>濾過器官と危険行動の原因を調べる</small>
        </button>
        <button
          type="button"
          disabled={!battle.observed || battle.pressureDefended}
          onClick={() => void runAction({ type: 'battleAction', action: 'defend' })}
        >
          <strong>ヌマクグリ：防御</strong>
          <small>予告された濁り水圧を受け止める</small>
        </button>
        <button
          type="button"
          disabled={!battle.pressureDefended || !battle.polluted}
          onClick={() => void runAction({ type: 'battleAction', action: 'cleanse' })}
        >
          <strong>主人公：汚染除去具</strong>
          <small>残り{battle.cleanserCount}個・汚染解除、警戒度−20</small>
        </button>
        <button
          type="button"
          disabled={battle.polluted || battle.calmed}
          onClick={() => void runAction({ type: 'battleAction', action: 'calm' })}
        >
          <strong>トモシゴケ：静かな明滅</strong>
          <small>鎮静を付与し、警戒度−20</small>
        </button>
        <button
          className="cooperation-action"
          type="button"
          disabled={!cooperationReady}
          onClick={() => void runAction({ type: 'battleAction', action: 'requestCooperation' })}
        >
          <strong>協力要請</strong>
          <small>{cooperationReady ? '条件達成・必ず成功します' : '生態条件を満たす必要があります'}</small>
        </button>
      </div>
    </section>
  )
}

export function ExplorationPage() {
  const { state, execute, saveStatus, retrySave } = useGameSession()
  const navigate = useNavigate()
  const recruited = state?.party.front.find((creature) => creature?.id === SUMIWATARI_ID)
  const [nickname, setNickname] = useState(recruited?.displayName ?? 'スミワタリ')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (recruited) setNickname(recruited.displayName)
  }, [recruited])

  if (!state || state.expedition.phase === 'idle') {
    return <Navigate to="/laboratory" replace />
  }

  const expedition = state.expedition
  const currentNode = expedition.currentNodeId
    ? graymossNodes[expedition.currentNodeId]
    : graymossNodes['marsh-entrance']

  async function runAction(action: ExplorationAction) {
    setActionError(null)
    try {
      await execute({ type: 'exploration', action })
      return true
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '保存に失敗しました。')
      return false
    }
  }

  async function returnToLaboratory() {
    if (await runAction({ type: 'returnToLaboratory' })) {
      navigate('/laboratory')
    }
  }

  async function finishRecruitment() {
    setActionError(null)
    try {
      if (recruited && nickname.trim() && nickname.trim() !== recruited.displayName) {
        await execute({ type: 'renameCreature', creatureId: recruited.id, name: nickname })
      }
      await execute({ type: 'exploration', action: { type: 'finishRecruitment' } })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '保存に失敗しました。')
    }
  }

  const saveLabel = {
    loading: '読込中',
    saved: '保存済み',
    saving: '保存中',
    retrying: '再保存中',
    failed: '保存失敗',
  }[saveStatus]

  return (
    <div className="expedition-shell">
      <header className="expedition-header">
        <div>
          <p>灰苔湿原・{currentNode.code}</p>
          <strong>{currentNode.name}</strong>
        </div>
        <span className={`status-badge status-${saveStatus}`}>{saveLabel}</span>
      </header>

      <main className="expedition-content">
        {(saveStatus === 'failed' || actionError) && (
          <section className="expedition-save-alert" role="alert">
            <strong>この操作を端末へ保存できませんでした。</strong>
            <p>{actionError ?? '通信ではなく、端末内保存の状態を確認しています。'}</p>
            <button type="button" onClick={() => void retrySave().catch((error: unknown) => {
              setActionError(error instanceof Error ? error.message : '再保存に失敗しました。')
            })}>
              もう一度保存する
            </button>
          </section>
        )}

        {expedition.phase === 'recruit-result' && saveStatus !== 'saved' && (
          <section className="field-event-card" aria-live="polite">
            <p className="eyebrow">重要記録</p>
            <h1>協力成立を保存しています</h1>
            <p>個体登録と前衛3枠目への配置を確定してから、呼称入力へ進みます。</p>
          </section>
        )}

        {expedition.phase === 'entrance' && (
          <section className="field-event-card">
            <p className="eyebrow">地点イベント</p>
            <h1>水へ触れる前に</h1>
            <div className="field-illustration entrance-illustration" aria-hidden="true">
              <span>灰</span><span>苔</span><span>水</span>
            </div>
            <p>主人公が採水しようとすると、トモシゴケの発光苔が青緑から灰色へ変わりました。</p>
            <blockquote>生物の反応を先に見る。記録は、その後に結論を出すためにある。</blockquote>
            <button className="primary-button full-button" type="button" onClick={() => void runAction({ type: 'observeEntrance' })}>
              生物の反応を観察する
            </button>
          </section>
        )}

        {expedition.phase === 'node-choice' && (
          <section className="field-event-card">
            <p className="eyebrow">地点選択</p>
            <h1>次の調査地点</h1>
            <p>水そのものより、混じった遺跡波動が異獣へ影響しています。浅瀬から停止した流れを追えます。</p>
            <button className="node-button" type="button" onClick={() => void runAction({ type: 'enterNode', nodeId: 'graymoss-shallows' })}>
              <span className="specimen-tag">GM-02</span>
              <strong>灰苔の浅瀬</strong>
              <small>{graymossNodes['graymoss-shallows'].summary}</small>
            </button>
          </section>
        )}

        {expedition.phase === 'battle' && <BattlePanel runAction={runAction} />}

        {expedition.phase === 'recruit-result' && saveStatus === 'saved' && (
          <section className="field-event-card recruit-card">
            <p className="eyebrow">協力成立</p>
            <h1>濁りの奥に澄んだ核</h1>
            <div className="specimen-orb recruited" aria-hidden="true">澄</div>
            <p>スミワタリは攻撃をやめ、トモシゴケの光を追って前衛の空き枠へ入りました。</p>
            <label htmlFor="creature-nickname">記録する呼称</label>
            <input
              id="creature-nickname"
              value={nickname}
              maxLength={20}
              onChange={(event) => setNickname(event.target.value)}
            />
            <button className="primary-button full-button" type="button" disabled={!nickname.trim()} onClick={() => void finishRecruitment()}>
              呼称を保存して分岐を確認
            </button>
          </section>
        )}

        {expedition.phase === 'branch-choice' && (
          <section className="field-event-card">
            <p className="eyebrow">前衛3体・最初の分岐</p>
            <h1>停止した流れを追う</h1>
            <p>役割の異なる3体が揃いました。この調査では、上流か下流のどちらか一方を選びます。</p>
            <div className="branch-grid">
              {(['observation-tower', 'sunken-waterway'] as const).map((nodeId) => {
                const node = graymossNodes[nodeId]
                return (
                  <button key={nodeId} className="node-button" type="button" onClick={() => void runAction({ type: 'enterNode', nodeId })}>
                    <span className="specimen-tag">{node.code}</span>
                    <strong>{node.name}</strong>
                    <small>{node.summary}</small>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {expedition.phase === 'branch-selected' && expedition.selectedBranchId && (
          <section className="field-event-card">
            <p className="eyebrow">調査経路を確定</p>
            <h1>{graymossNodes[expedition.selectedBranchId].name}</h1>
            <p>{graymossNodes[expedition.selectedBranchId].summary}</p>
            <p className="field-note">分岐先の地点イベントは次の実装範囲です。選択した経路は保存されています。</p>
            <button className="primary-button full-button" type="button" onClick={() => void returnToLaboratory()}>
              研究所へ帰還する
            </button>
          </section>
        )}

        {!['battle', 'recruit-result', 'branch-selected'].includes(expedition.phase) && (
          <button className="return-button" type="button" onClick={() => void returnToLaboratory()}>
            調査を中断して研究所へ戻る
          </button>
        )}
      </main>
    </div>
  )
}
