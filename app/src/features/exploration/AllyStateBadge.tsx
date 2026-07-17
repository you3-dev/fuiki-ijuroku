import type { ReactNode } from 'react'

export type AllyStateTone = 'pollution' | 'guard' | 'protect'

export function AllyStateBadge({
  tone,
  children,
}: {
  tone: AllyStateTone
  children: ReactNode
}) {
  return <small className={`ally-state-badge is-${tone}`}>{children}</small>
}
