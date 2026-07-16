type BattleCommandMenuProps = {
  actorName: string
  skillOpen: boolean
  attackDisabled?: boolean
  attackHint?: string
  skillDisabled?: boolean
  defendDisabled?: boolean
  defendHint?: string
  onAttack: () => void
  onToggleSkills: () => void
  onDefend: () => void
}

export function BattleCommandMenu({
  actorName,
  skillOpen,
  attackDisabled = false,
  attackHint = '攻撃・活性＋20',
  skillDisabled = false,
  defendDisabled = false,
  defendHint = '被害軽減・活性＋25',
  onAttack,
  onToggleSkills,
  onDefend,
}: BattleCommandMenuProps) {
  return (
    <div className="battle-command-grid" aria-label={`${actorName}の行動`}>
      <button type="button" disabled={attackDisabled} onClick={onAttack}>
        <strong>たたかう</strong>
        <small>{attackHint}</small>
      </button>
      <button
        type="button"
        disabled={skillDisabled}
        className={skillOpen ? 'is-selected' : undefined}
        aria-expanded={skillOpen}
        onClick={onToggleSkills}
      >
        <strong>特技</strong>
        <small>活性を使う</small>
      </button>
      <button type="button" disabled={defendDisabled} onClick={onDefend}>
        <strong>防御</strong>
        <small>{defendHint}</small>
      </button>
      <button type="button" disabled>
        <strong>交代</strong>
        <small>控えなし</small>
      </button>
    </div>
  )
}
