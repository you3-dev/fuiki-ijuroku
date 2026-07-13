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

  it('completes the first expedition, recruits into the third front slot, and does not duplicate it', () => {
    const actions = [
      { type: 'startExpedition' } as const,
      { type: 'observeEntrance' } as const,
      { type: 'enterNode', nodeId: 'graymoss-shallows' } as const,
      { type: 'battleAction', action: 'observe' } as const,
      { type: 'battleAction', action: 'defend' } as const,
      { type: 'battleAction', action: 'cleanse' } as const,
      { type: 'battleAction', action: 'calm' } as const,
      { type: 'battleAction', action: 'requestCooperation' } as const,
    ]
    const prepared = executeGameCommand(createInitialGameState(), {
      type: 'recordPreparation',
    })
    const recruited = actions.reduce(
      (state, action) => executeGameCommand(state, { type: 'exploration', action }),
      prepared,
    )

    expect(recruited.party.front[2]).toMatchObject({
      id: 'creature-sumiwatari-tutorial-001',
      speciesId: 'sumiwatari',
      displayName: 'スミワタリ',
    })
    expect(recruited.party.reserve).toEqual([null, null, null])
    expect(
      recruited.researchUpdates.filter(
        (update) => update.id === 'update-sumiwatari-recruited',
      ),
    ).toHaveLength(1)

    const renamed = executeGameCommand(recruited, {
      type: 'renameCreature',
      creatureId: 'creature-sumiwatari-tutorial-001',
      name: '  ミナモ  ',
    })
    const returned = executeGameCommand(renamed, {
      type: 'exploration',
      action: { type: 'finishRecruitment' },
    })
    const restarted = executeGameCommand(
      executeGameCommand(returned, {
        type: 'exploration',
        action: { type: 'returnToLaboratory' },
      }),
      { type: 'exploration', action: { type: 'startExpedition' } },
    )

    expect(renamed.party.front[2]?.displayName).toBe('ミナモ')
    expect(restarted.expedition.phase).toBe('branch-choice')
    expect(
      [...restarted.party.front, ...restarted.party.reserve].filter(
        (creature) => creature?.id === 'creature-sumiwatari-tutorial-001',
      ),
    ).toHaveLength(1)
  })

  it('does not start the first expedition without preparation and an open third front slot', () => {
    const initial = createInitialGameState()
    const withoutPreparation = executeGameCommand(initial, {
      type: 'exploration',
      action: { type: 'startExpedition' },
    })
    expect(withoutPreparation).toBe(initial)

    const prepared = executeGameCommand(initial, { type: 'recordPreparation' })
    const fullFront = {
      ...prepared,
      party: {
        ...prepared.party,
        front: [
          ...prepared.party.front.slice(0, 2),
          {
            id: 'creature-blocking-slot',
            speciesId: 'other',
            displayName: '仮個体',
            level: 1,
            role: '検証',
            status: 'ready' as const,
          },
        ],
      },
    }
    expect(
      executeGameCommand(fullFront, {
        type: 'exploration',
        action: { type: 'startExpedition' },
      }),
    ).toBe(fullFront)
  })

  it('completes the observation tower, recruits Kirihane once, and records progress', () => {
    let state = executeGameCommand(createInitialGameState(), {
      type: 'recordPreparation',
    })
    const firstLoop = [
      { type: 'startExpedition' } as const,
      { type: 'observeEntrance' } as const,
      { type: 'enterNode', nodeId: 'graymoss-shallows' } as const,
      { type: 'battleAction', action: 'observe' } as const,
      { type: 'battleAction', action: 'defend' } as const,
      { type: 'battleAction', action: 'cleanse' } as const,
      { type: 'battleAction', action: 'calm' } as const,
      { type: 'battleAction', action: 'requestCooperation' } as const,
      { type: 'finishRecruitment' } as const,
      { type: 'enterNode', nodeId: 'observation-tower' } as const,
      { type: 'beginTowerEncounter' } as const,
    ]
    for (const action of firstLoop) {
      state = executeGameCommand(state, { type: 'exploration', action })
    }

    const towerCommands = [
      { type: 'setSupport', support: 'observe-call' } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
      { type: 'setSupport', support: 'calming-chime' } as const,
      {
        type: 'setPlan',
        actorId: 'tomoshigoke',
        plan: { kind: 'skill', skillId: 'calming-glimmer', targetId: 'kirihane' },
      } as const,
      {
        type: 'setPlan',
        actorId: 'numakuguri',
        plan: { kind: 'skill', skillId: 'burrow-guard', targetId: 'tomoshigoke' },
      } as const,
      {
        type: 'setPlan',
        actorId: 'sumiwatari',
        plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'tomoshigoke' },
      } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
      { type: 'setSupport', support: 'request-cooperation' } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
    ]
    for (const command of towerCommands) {
      state = executeGameCommand(state, {
        type: 'exploration',
        action: { type: 'towerBattleCommand', command },
      })
    }

    expect(state.expedition.phase).toBe('tower-result')
    expect(state.party.reserve[0]).toMatchObject({
      id: 'creature-kirihane-tower-001',
      speciesId: 'kirihane',
    })

    state = executeGameCommand(state, {
      type: 'exploration',
      action: { type: 'alignTowerReflector' },
    })
    expect(state.expedition).toMatchObject({
      phase: 'tower-complete',
      towerCompleted: true,
    })
    expect(state.objective.recordsFound).toBe(1)
    expect(state.objective.valvesRestored).toBe(1)
    expect(
      state.researchUpdates.filter(
        (update) => update.id === 'update-upstream-valve-restored',
      ),
    ).toHaveLength(1)
  })
})
