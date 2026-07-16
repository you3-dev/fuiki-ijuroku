import { useEffect, useRef, useState } from 'react'

type BattleValueTone = 'hp' | 'pollution'

function percentage(value: number, max: number) {
  if (max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
}

export function BattleValueBar({
  value,
  max,
  label,
  tone = 'hp',
  compact = false,
}: {
  value: number
  max: number
  label: string
  tone?: BattleValueTone
  compact?: boolean
}) {
  const previousValue = useRef(value)
  const trailTimer = useRef<number | undefined>(undefined)
  const changeTimer = useRef<number | undefined>(undefined)
  const [trailValue, setTrailValue] = useState(value)
  const [change, setChange] = useState<'decrease' | 'increase' | null>(null)

  useEffect(() => {
    const previous = previousValue.current
    previousValue.current = value
    window.clearTimeout(trailTimer.current)
    window.clearTimeout(changeTimer.current)

    if (value < previous) {
      setChange('decrease')
      trailTimer.current = window.setTimeout(() => setTrailValue(value), 420)
    } else if (value > previous) {
      setTrailValue(value)
      setChange('increase')
    }

    changeTimer.current = window.setTimeout(() => setChange(null), 720)
    return () => {
      window.clearTimeout(trailTimer.current)
      window.clearTimeout(changeTimer.current)
    }
  }, [value])

  return (
    <div
      className={`battle-value-bar is-${tone}${compact ? ' is-compact' : ''}`}
      data-change={change ?? undefined}
    >
      <div
        className="battle-value-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}/${max}`}
      >
        <i className="battle-value-trail" style={{ width: `${percentage(trailValue, max)}%` }} />
        <i className="battle-value-fill" style={{ width: `${percentage(value, max)}%` }} />
      </div>
    </div>
  )
}
