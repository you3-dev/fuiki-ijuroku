import { NavLink, Outlet } from 'react-router'
import { useGameSession } from './GameSessionContext'
import { useOnlineStatus } from './useOnlineStatus'

const saveLabels = {
  loading: '読込中',
  saved: '保存済み',
  saving: '記録中',
  retrying: '再試行中',
  failed: '保存失敗',
} as const

export function AppShell() {
  const { saveStatus } = useGameSession()
  const online = useOnlineStatus()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">第七辺境生態研究所</span>
          <h1>封域異獣録</h1>
        </div>
        <div className="status-cluster" aria-live="polite">
          <span className={`status-badge status-${saveStatus}`}>
            {saveLabels[saveStatus]}
          </span>
          {!online && <span className="status-badge status-offline">オフライン</span>}
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="tab-bar" aria-label="主要画面">
        <NavLink to="/laboratory">
          <span className="tab-mark" aria-hidden="true">研</span>
          <span>研究所</span>
        </NavLink>
        <NavLink to="/party">
          <span className="tab-mark" aria-hidden="true">隊</span>
          <span>編成</span>
        </NavLink>
        <NavLink to="/bestiary">
          <span className="tab-mark" aria-hidden="true">録</span>
          <span>異獣録</span>
        </NavLink>
      </nav>
    </div>
  )
}
