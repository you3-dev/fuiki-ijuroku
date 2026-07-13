import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { BestiaryPage } from '../features/bestiary/BestiaryPage'
import { ExplorationPage } from '../features/exploration/ExplorationPage'
import { LaboratoryHomePage } from '../features/laboratory/LaboratoryHomePage'
import { PartyPage } from '../features/party/PartyPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { AppShell } from './AppShell'
import { useGameSession } from './GameSessionContext'

export function AppRouter() {
  const { state, saveStatus, bootError, retryLoad, resetSession } = useGameSession()
  const [confirmReset, setConfirmReset] = useState(false)

  if (!state && saveStatus === 'loading') {
    return (
      <main className="boot-screen">
        <div className="ancient-seal" aria-hidden="true">異</div>
        <p className="eyebrow">調査記録を確認しています</p>
        <h1>封域異獣録</h1>
      </main>
    )
  }

  if (!state || bootError) {
    return (
      <main className="boot-screen recovery-screen">
        <div className="ancient-seal seal-alert" aria-hidden="true">!</div>
        <p className="eyebrow">記録復旧</p>
        <h1>セーブを読み込めませんでした</h1>
        <p>{bootError ?? '保存データを確認できません。'}</p>
        <button className="primary-button" type="button" onClick={() => void retryLoad()}>
          もう一度確認
        </button>
        {!confirmReset ? (
          <button className="secondary-button" type="button" onClick={() => setConfirmReset(true)}>
            新しい記録で開始
          </button>
        ) : (
          <div className="recovery-confirmation">
            <p>端末内の現在のセーブを初期状態で置き換えます。この操作は元に戻せません。</p>
            <div className="button-row">
              <button className="danger-button" type="button" onClick={() => void resetSession()}>
                初期化して開始
              </button>
              <button className="secondary-button" type="button" onClick={() => setConfirmReset(false)}>
                やめる
              </button>
            </div>
          </div>
        )}
      </main>
    )
  }

  const explorationLocked =
    state.expedition.phase === 'battle' ||
    (state.expedition.phase === 'recruit-result' && saveStatus !== 'saved')

  return (
    <Routes>
      <Route path="exploration" element={<ExplorationPage />} />
      <Route
        element={
          explorationLocked
            ? <Navigate to="/exploration" replace />
            : <AppShell />
        }
      >
        <Route index element={<Navigate to="/laboratory" replace />} />
        <Route path="laboratory" element={<LaboratoryHomePage />} />
        <Route path="party" element={<PartyPage />} />
        <Route path="bestiary" element={<BestiaryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/laboratory" replace />} />
      </Route>
    </Routes>
  )
}
