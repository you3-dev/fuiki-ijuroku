import { describe, expect, it } from 'vitest'
import { executeGameCommand } from './commands'
import { createInitialGameState } from './createInitialState'

describe('executeGameCommand', () => {
  it('records preparation and advances the revision once', () => {
    const initial = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const next = executeGameCommand(initial, { type: 'recordPreparation' })

    expect(next.objective.preparationRecorded).toBe(true)
    expect(next.revision).toBe(initial.revision + 1)
    expect(executeGameCommand(next, { type: 'recordPreparation' })).toBe(next)
  })

  it('acknowledges only the selected research update', () => {
    const initial = createInitialGameState()
    const targetId = initial.researchUpdates[0].id
    const next = executeGameCommand(initial, {
      type: 'acknowledgeUpdate',
      updateId: targetId,
    })

    expect(next.researchUpdates[0].acknowledged).toBe(true)
    expect(next.researchUpdates[1].acknowledged).toBe(false)
  })

  it('normalizes the player name without mutating the previous state', () => {
    const initial = createInitialGameState()
    const next = executeGameCommand(initial, {
      type: 'renamePlayer',
      name: '  灰\u0000苔調査員  ',
    })

    expect(next.profile.name).toBe('灰苔調査員')
    expect(initial.profile.name).toBe('新人調査員')
  })

  it('does not advance the revision for an empty name', () => {
    const initial = createInitialGameState()
    expect(executeGameCommand(initial, { type: 'renamePlayer', name: '   ' })).toBe(
      initial,
    )
  })
})
