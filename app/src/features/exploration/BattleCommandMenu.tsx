type BattleCommandMenuProps = {
  actorName: string
  skillOpen: boolean
  selectedAction?: 'attack' | 'skill' | 'defend'
  focusAction?: 'attack' | 'skill' | 'defend'
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
  selectedAction,
  focusAction,
  attackDisabled = false,
  attackHint = '攻撃・活性＋20',
  skillDisabled = false,
  defendDisabled = false,
  defendHint = '被害軽減・活性＋25',
  onAttack,
  onToggleSkills,
  onDefend,
}: BattleCommandMenuProps) {
  function commandClass(action: 'attack' | 'skill' | 'defend') {
    return [
      selectedAction === action ? 'is-selected' : '',
      focusAction === action ? 'is-focused' : '',
    ].filter(Boolean).join(' ') || undefined
  }

  return (
    <div className="battle-command-grid" aria-label={`${actorName}の行動`}>
      <button
        type="button"
        className={commandClass('attack')}
        aria-pressed={selectedAction === 'attack'}
        disabled={attackDisabled}
        onClick={onAttack}
      >
        <strong>たたかう</strong>
        <small>{attackHint}</small>
      </button>
      <button
        type="button"
        disabled={skillDisabled}
        className={commandClass('skill')}
        aria-pressed={selectedAction === 'skill'}
        aria-expanded={skillOpen}
        onClick={onToggleSkills}
      >
        <strong>特技</strong>
        <small>活性を使う</small>
      </button>
      <button
        type="button"
        className={commandClass('defend')}
        aria-pressed={selectedAction === 'defend'}
        disabled={defendDisabled}
        onClick={onDefend}
      >
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
