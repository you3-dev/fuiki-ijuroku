import { useGameSession } from '../../app/GameSessionContext'

export function PartyPage() {
  const { state } = useGameSession()
  if (!state) return null

  return (
    <div className="page-stack">
      <section className="page-intro">
        <p className="eyebrow">調査隊管理</p>
        <h2>編成</h2>
        <p>前衛は最大3体。最初の調査は2体編成で開始します。</p>
      </section>

      <section className="paper-card">
        <p className="card-kicker">前衛</p>
        <h3>出撃個体</h3>
        <ol className="party-list">
          {state.party.front.map((creature, index) => (
            <li key={creature?.id ?? `empty-${index}`}>
              <span className="slot-number">{index + 1}</span>
              {creature ? (
                <div>
                  <strong>{creature.displayName}</strong>
                  <p>Lv.{creature.level}・{creature.role}</p>
                </div>
              ) : (
                <div>
                  <strong>空き枠</strong>
                  <p>最初の協力個体を配置できます。</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="paper-card">
        <p className="card-kicker">控え</p>
        <h3>交代待機個体</h3>
        <ol className="party-list">
          {state.party.reserve.map((creature, index) => (
            <li key={creature?.id ?? `reserve-empty-${index}`}>
              <span className="slot-number">控{index + 1}</span>
              {creature ? (
                <div>
                  <strong>{creature.displayName}</strong>
                  <p>Lv.{creature.level}・{creature.role}</p>
                </div>
              ) : (
                <div>
                  <strong>空き枠</strong>
                  <p>加入個体を控えへ配置できます。</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="paper-card muted-card">
        <p className="card-kicker">技術スパイク</p>
        <h3>編成操作は次工程</h3>
        <p>この段階では、保存済み編成を正しく表示できることだけを確認します。</p>
      </section>
    </div>
  )
}
