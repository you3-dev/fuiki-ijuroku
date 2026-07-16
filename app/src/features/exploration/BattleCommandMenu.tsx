type BattleCommandMenuProps = {
  actorName: string
  skillOpen: boolean
  onAttack: () => void
  onToggleSkills: () => void
  onDefend: () => void
}

export function BattleCommandMenu({
  actorName,
  skillOpen,
  onAttack,
  onToggleSkills,
  onDefend,
}: BattleCommandMenuProps) {
  return (
    <div className="battle-command-grid" aria-label={`${actorName}の行動`}>
      <button type="button" onClick={onAttack}>
        <strong>たたかう</strong>
        <small>攻撃・活性＋20</small>
      </button>
      <button
        type="button"
        className={skillOpen ? 'is-selected' : undefined}
        aria-expanded={skillOpen}
        onClick={onToggleSkills}
      >
        <strong>特技</strong>
        <small>活性を使う</small>
      </button>
      <button type="button" onClick={onDefend}>
        <strong>防御</strong>
        <small>被害軽減・活性＋25</small>
      </button>
      <button type="button" disabled>
        <strong>交代</strong>
        <small>控えなし</small>
      </button>
    </div>
  )
}
