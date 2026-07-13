import { useRegisterSW } from 'virtual:pwa-register/react'
import { useGameSession } from './GameSessionContext'

export function PwaUpdatePrompt() {
  const { state, saveStatus, retrySave } = useGameSession()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const canUpdate = state !== null && ['saved', 'failed'].includes(saveStatus)

  async function handleUpdate() {
    if (!canUpdate) return
    try {
      if (saveStatus === 'failed') await retrySave()
      await updateServiceWorker(true)
    } catch {
      // retrySave updates the shared save status; keep the current app open.
    }
  }

  return (
    <aside className="update-toast" aria-live="polite">
      <p>
        {needRefresh
          ? saveStatus === 'saving' || saveStatus === 'retrying'
            ? '保存完了後に新しいアプリへ更新できます。'
            : '新しい調査記録アプリを利用できます。'
          : 'オフラインでも起動できるようになりました。'}
      </p>
      <div className="button-row">
        {needRefresh && (
          <button
            className="primary-button compact-button"
            type="button"
            disabled={!canUpdate}
            onClick={() => void handleUpdate()}
          >
            {saveStatus === 'failed' ? '保存を再試行して更新' : '更新して再起動'}
          </button>
        )}
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => {
            setOfflineReady(false)
            setNeedRefresh(false)
          }}
        >
          あとで
        </button>
      </div>
    </aside>
  )
}
