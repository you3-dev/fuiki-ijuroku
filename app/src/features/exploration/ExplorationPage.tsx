import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useGameSession } from '../../app/GameSessionContext'
import { canRequestCooperation } from '../../domain/exploration/commands'
import { graymossNodes } from '../../domain/exploration/data'
import type { ExplorationAction } from '../../domain/exploration/types'
import { TowerBattlePanel } from './TowerBattlePanel'
import { WaterwayBattlePanel } from './WaterwayBattlePanel'

const SUMIWATARI_ID = 'creature-sumiwatari-tutorial-001'
const KIRIHANE_ID = 'creature-kirihane-tower-001'

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
  const recruitedKirihane = state
    ? [...state.party.front, ...state.party.reserve].find(
        (creature) => creature?.id === KIRIHANE_ID,
      )
    : undefined
  const [nickname, setNickname] = useState(recruited?.displayName ?? 'スミワタリ')
  const [kirihaneNickname, setKirihaneNickname] = useState(
    recruitedKirihane?.displayName ?? 'キリハネ',
  )
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (recruited) setNickname(recruited.displayName)
  }, [recruited])

  useEffect(() => {
    if (recruitedKirihane) setKirihaneNickname(recruitedKirihane.displayName)
  }, [recruitedKirihane])

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

  async function finishTowerResult() {
    setActionError(null)
    try {
      if (
        recruitedKirihane &&
        kirihaneNickname.trim() &&
        kirihaneNickname.trim() !== recruitedKirihane.displayName
      ) {
        await execute({
          type: 'renameCreature',
          creatureId: recruitedKirihane.id,
          name: kirihaneNickname,
        })
      }
      await execute({ type: 'exploration', action: { type: 'alignTowerReflector' } })
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

        {expedition.phase === 'tower-result' && saveStatus !== 'saved' && (
          <section className="field-event-card" aria-live="polite">
            <p className="eyebrow">重要記録</p>
            <h1>キリハネの協力を保存しています</h1>
            <p>控えへの個体登録を確定してから、先遣隊記録と上流弁を処理します。</p>
          </section>
        )}

        {expedition.phase === 'waterway-result' && saveStatus !== 'saved' && (
          <section className="field-event-card" aria-live="polite">
            <p className="eyebrow">重要記録</p>
            <h1>安全な流路を保存しています</h1>
            <p>汚染戦の解決を確定してから、先遣隊第2記録と下流弁を処理します。</p>
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

        {expedition.phase === 'tower-event' && (
          <section className="field-event-card tower-arrival-card">
            <p className="eyebrow">観測櫓跡・地点イベント</p>
            <h1>霧の中の短い鳴き声</h1>
            <div className="field-illustration tower-illustration" aria-hidden="true">
              <span>櫓</span><span>霧</span><span>翅</span>
            </div>
            <p>折れた観測櫓の上から、一定周期の鳴き声が返っています。霧は濃いものの、敵意だけで発生したものには見えません。</p>
            <blockquote>攻撃音を混ぜず、前衛3体の防御を先に揃える。霧の中で残る音だけを記録する。</blockquote>
            <button className="primary-button full-button" type="button" onClick={() => void runAction({ type: 'beginTowerEncounter' })}>
              前衛3体の行動を計画する
            </button>
          </section>
        )}

        {expedition.phase === 'tower-battle' && (
          <TowerBattlePanel runAction={runAction} />
        )}

        {expedition.phase === 'waterway-event' && (
          <section className="field-event-card waterway-arrival-card">
            <p className="eyebrow">沈み水路・短い分岐調査</p>
            <h1>沈殿の下に二つの生命核</h1>
            <div className="field-illustration waterway-illustration" aria-hidden="true">
              <span>取</span><span>濁</span><span>弁</span>
            </div>
            <p>水没した取水桝の先で、汚染された野生スミワタリと、黒い沈殿を広げる環境塊が重なっています。</p>
            <div className="branch-grid">
              <button
                className="node-button recommended-route"
                type="button"
                onClick={() => void runAction({
                  type: 'selectWaterwayApproach',
                  approach: 'observe-intake',
                })}
              >
                <span className="specimen-tag">推奨・慎重</span>
                <strong>取水桝の濁りを観察する</strong>
                <small>警戒度40。汚染源を特定し、最初の澄み流しを強化します。</small>
              </button>
              <button
                className="node-button"
                type="button"
                onClick={() => void runAction({
                  type: 'selectWaterwayApproach',
                  approach: 'hurry-to-valve',
                })}
              >
                <span className="specimen-tag">強行</span>
                <strong>下流弁へ急ぐ</strong>
                <small>警戒度60。前衛に汚染が付着し、浄化に時間がかかります。</small>
              </button>
            </div>
          </section>
        )}

        {expedition.phase === 'waterway-battle' && (
          <WaterwayBattlePanel runAction={runAction} />
        )}

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

        {expedition.phase === 'tower-result' && saveStatus === 'saved' && (
          <section className="field-event-card recruit-card">
            <p className="eyebrow">協力成立・先遣隊第1記録</p>
            <h1>霧は道を隠すためにあった</h1>
            <div className="specimen-orb recruited" aria-hidden="true">霧</div>
            <p>キリハネは主人公たちを反射板の残る足場へ導きました。先遣隊は鳴き声と移動経路を使い、安全な上流弁への道を記録していました。</p>
            <label htmlFor="kirihane-nickname">記録する呼称</label>
            <input
              id="kirihane-nickname"
              value={kirihaneNickname}
              maxLength={20}
              onChange={(event) => setKirihaneNickname(event.target.value)}
            />
            <button className="primary-button full-button" type="button" disabled={!kirihaneNickname.trim()} onClick={() => void finishTowerResult()}>
              呼称を保存して反射板を合わせる
            </button>
          </section>
        )}

        {expedition.phase === 'tower-complete' && (
          <section className="field-event-card">
            <p className="eyebrow">上流弁復旧</p>
            <h1>遠隔操作信号を確認</h1>
            <p>霧が薄くなる周期に反射板を合わせ、古代制御塔へ信号を送りました。湿原上流から、止まっていた水音が戻ります。</p>
            <div className="progress-grid" aria-label="現在の調査成果">
              <div><span>先遣隊記録</span><strong>{state.objective.recordsFound} / {state.objective.recordsTotal}</strong></div>
              <div><span>水路弁復旧</span><strong>{state.objective.valvesRestored} / {state.objective.valvesTotal}</strong></div>
            </div>
            <button className="primary-button full-button" type="button" onClick={() => void returnToLaboratory()}>
              研究所へ帰還する
            </button>
          </section>
        )}

        {expedition.phase === 'waterway-result' && saveStatus === 'saved' && (
          <section className="field-event-card">
            <p className="eyebrow">安全確保・先遣隊第2記録</p>
            <h1>停止ではなく、外部からの命令</h1>
            <div className="specimen-orb recruited" aria-hidden="true">録</div>
            <p>弁室の刻印には、施設の自然故障ではなく、外部から古代制御命令が送られた形跡が残っていました。</p>
            <blockquote>研究所の通常回線へ送るな。記録は封印し、次の合流地点まで保持せよ。</blockquote>
            <button
              className="primary-button full-button"
              type="button"
              onClick={() => void runAction({ type: 'flushWaterwayValve' })}
            >
              澄み流しで弁内部を洗浄する
            </button>
          </section>
        )}

        {expedition.phase === 'waterway-complete' && (
          <section className="field-event-card">
            <p className="eyebrow">下流弁復旧</p>
            <h1>沈殿の下から水音が戻る</h1>
            <p>スミワタリの濾過流が弁内部を巡り、黒い沈殿物を排出しました。下流側の水路に青緑の色が戻ります。</p>
            <div className="progress-grid" aria-label="現在の調査成果">
              <div><span>先遣隊記録</span><strong>{state.objective.recordsFound} / {state.objective.recordsTotal}</strong></div>
              <div><span>水路弁復旧</span><strong>{state.objective.valvesRestored} / {state.objective.valvesTotal}</strong></div>
            </div>
            <button className="primary-button full-button" type="button" onClick={() => void returnToLaboratory()}>
              研究所へ帰還する
            </button>
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

        {![
          'battle',
          'recruit-result',
          'branch-selected',
          'tower-battle',
          'tower-result',
          'tower-complete',
          'waterway-battle',
          'waterway-result',
          'waterway-complete',
        ].includes(expedition.phase) && (
          <button className="return-button" type="button" onClick={() => void returnToLaboratory()}>
            調査を中断して研究所へ戻る
          </button>
        )}
      </main>
    </div>
  )
}
