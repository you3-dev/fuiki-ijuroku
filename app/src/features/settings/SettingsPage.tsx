import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useGameSession } from '../../app/GameSessionContext'
import {
  downloadGameBackup,
  parseGameBackup,
} from '../../infrastructure/backup/gameBackup'

export function SettingsPage() {
  const { state, execute, restore, saveStatus, retrySave } = useGameSession()
  const [name, setName] = useState(state?.profile.name ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state) setName(state.profile.name)
  }, [state])

  if (!state) return null

  async function handleNameSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setMessage('調査員名を入力してください。')
      return
    }
    try {
      await execute({ type: 'renamePlayer', name })
      setMessage('調査員名を保存しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました。')
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const backupState = parseGameBackup(await file.text())
      await restore(backupState)
      setMessage('バックアップを復元しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '復元に失敗しました。')
    }
  }

  return (
    <div className="page-stack">
      <section className="page-intro settings-intro">
        <div>
          <p className="eyebrow">調査記録管理</p>
          <h2>設定・保存</h2>
        </div>
        <Link className="text-link" to="/laboratory">研究所へ戻る</Link>
      </section>

      {message && <p className="notice" role="status">{message}</p>}

      <section className="paper-card">
        <p className="card-kicker">主人公</p>
        <h3>調査員名</h3>
        <form className="settings-form" onSubmit={(event) => void handleNameSubmit(event)}>
          <label htmlFor="player-name">記録に表示する名前</label>
          <input
            id="player-name"
            name="player-name"
            value={name}
            maxLength={20}
            onChange={(event) => setName(event.target.value)}
          />
          <button className="primary-button" type="submit">名前を保存</button>
        </form>
      </section>

      <section className="paper-card">
        <p className="card-kicker">表示と音声</p>
        <h3>端末設定</h3>
        <div className="toggle-list">
          <label>
            <span>
              <strong>音声（未実装）</strong>
              <small>音声再生を実装するまでは変更できません。</small>
            </span>
            <input
              type="checkbox"
              checked={state.settings.soundEnabled}
              disabled
              readOnly
            />
          </label>
          <label>
            <span>
              <strong>動きを減らす</strong>
              <small>反復する装飾と移動量を抑えます。</small>
            </span>
            <input
              type="checkbox"
              checked={state.settings.reduceMotion}
              onChange={(event) => {
                void execute({
                  type: 'updateSettings',
                  patch: { reduceMotion: event.target.checked },
                }).catch((error: unknown) => {
                  setMessage(error instanceof Error ? error.message : '保存に失敗しました。')
                })
              }}
            />
          </label>
        </div>
      </section>

      <section className="paper-card">
        <p className="card-kicker">バックアップ</p>
        <h3>調査記録の書出し</h3>
        <p>JSONファイルには、現在の技術スパイク用セーブだけが含まれます。</p>
        <div className="stacked-buttons">
          <button className="secondary-button" type="button" onClick={() => downloadGameBackup(state)}>
            JSONを書き出す
          </button>
          <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
            JSONから復元する
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event)}
          />
        </div>
      </section>

      {saveStatus === 'failed' && (
        <section className="paper-card danger-card">
          <p className="card-kicker">保存失敗</p>
          <h3>最新の記録は端末へ保存されていません</h3>
          <button
            className="danger-button"
            type="button"
            onClick={() => void retrySave().catch(() => undefined)}
          >
            保存を再試行
          </button>
        </section>
      )}
    </div>
  )
}
