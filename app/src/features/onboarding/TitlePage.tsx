import { useNavigate } from 'react-router'
import { useGameSession } from '../../app/GameSessionContext'

export function TitlePage() {
  const { state } = useGameSession()
  const navigate = useNavigate()
  if (!state) return null
  const currentState = state

  const isFreshRecord =
    !currentState.objective.preparationRecorded &&
    !currentState.expedition.firstRecruitmentCompleted &&
    currentState.expedition.phase === 'idle'

  function continueRecord() {
    if (isFreshRecord) {
      navigate('/prologue')
      return
    }

    navigate(currentState.expedition.phase === 'idle' ? '/laboratory' : '/exploration')
  }

  return (
    <main className="title-screen">
      <img
        className="title-background"
        src={`${import.meta.env.BASE_URL}art/title-graymoss.webp`}
        alt="霧に沈む灰苔湿原と古代施設の管路"
      />
      <div className="title-vignette" aria-hidden="true" />
      <button
        className="title-settings"
        type="button"
        onClick={() => navigate('/settings')}
        aria-label="設定・保存を開く"
      >
        <span aria-hidden="true">⚙</span>
        <span>設定</span>
      </button>
      <section className="title-content">
        <div className="title-seal" aria-hidden="true">異</div>
        <p className="title-kicker">第七辺境生態研究所・封鎖地調査記録</p>
        <h1>封域異獣録</h1>
        <p className="title-reading">ふういきいじゅうろく</p>
        <p className="title-tagline">
          封鎖地の異獣を観察し、<br />傷つけず共に帰る調査RPG
        </p>
      </section>
      <div className="title-actions">
        <button className="title-start-button" type="button" onClick={continueRecord}>
          <span>{isFreshRecord ? '調査を始める' : '記録から再開'}</span>
          <small>
            {isFreshRecord
              ? '灰苔湿原・最初の任務'
              : `${state.objective.title}　記録 ${state.objective.recordsFound}/${state.objective.recordsTotal}`}
          </small>
        </button>
        <p>端末内へ自動保存・オフライン対応</p>
      </div>
    </main>
  )
}
