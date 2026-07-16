import { describe, expect, it } from 'vitest'
import { executeGameCommand } from './commands'
import { createInitialGameState } from './createInitialState'
import type { CoreBossBattleCommand } from '../battle/types'

const completeIntroBattle = [
  { type: 'setIntroBattlePlan', actorId: 'tomoshigoke', plan: 'attack' } as const,
  { type: 'setIntroBattlePlan', actorId: 'numakuguri', plan: 'defend' } as const,
  { type: 'resolveIntroBattleRound' } as const,
  { type: 'setIntroBattlePlan', actorId: 'tomoshigoke', plan: 'attack' } as const,
  { type: 'setIntroBattlePlan', actorId: 'numakuguri', plan: 'attack' } as const,
  { type: 'resolveIntroBattleRound' } as const,
  { type: 'setIntroBattlePlan', actorId: 'tomoshigoke', plan: 'attack' } as const,
  { type: 'setIntroBattlePlan', actorId: 'numakuguri', plan: 'attack' } as const,
  { type: 'resolveIntroBattleRound' } as const,
  { type: 'finishIntroBattle' } as const,
]

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
      ...completeIntroBattle,
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

  it('starts without a read-only preparation gate but still requires an open third front slot', () => {
    const initial = createInitialGameState()
    const started = executeGameCommand(initial, {
      type: 'exploration',
      action: { type: 'startExpedition' },
    })
    expect(started.expedition.phase).toBe('entrance')
    expect(started.objective.preparationRecorded).toBe(true)

    const fullFront = {
      ...initial,
      party: {
        ...initial.party,
        front: [
          ...initial.party.front.slice(0, 2),
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

  it('completes both branches and the filter grove with one-time rewards', () => {
    let state = executeGameCommand(createInitialGameState(), {
      type: 'recordPreparation',
    })
    const firstLoop = [
      { type: 'startExpedition' } as const,
      { type: 'observeEntrance' } as const,
      ...completeIntroBattle,
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

    const waterwayActions = [
      { type: 'returnToLaboratory' } as const,
      { type: 'startExpedition' } as const,
      { type: 'enterNode', nodeId: 'sunken-waterway' } as const,
      { type: 'selectWaterwayApproach', approach: 'observe-intake' } as const,
    ]
    for (const action of waterwayActions) {
      state = executeGameCommand(state, { type: 'exploration', action })
    }
    const waterwayCommands = [
      {
        type: 'setPlan', actorId: 'tomoshigoke',
        plan: { kind: 'skill', skillId: 'calming-glimmer', targetId: 'polluted-sumiwatari' },
      } as const,
      {
        type: 'setPlan', actorId: 'numakuguri',
        plan: { kind: 'skill', skillId: 'burrow-guard', targetId: 'tomoshigoke' },
      } as const,
      {
        type: 'setPlan', actorId: 'sumiwatari',
        plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'pollution-mass' },
      } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
      {
        type: 'setPlan', actorId: 'tomoshigoke',
        plan: { kind: 'defend', targetId: 'tomoshigoke' },
      } as const,
      {
        type: 'setPlan', actorId: 'numakuguri',
        plan: { kind: 'defend', targetId: 'numakuguri' },
      } as const,
      {
        type: 'setPlan', actorId: 'sumiwatari',
        plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'polluted-sumiwatari' },
      } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
      {
        type: 'setPlan', actorId: 'sumiwatari',
        plan: { kind: 'defend', targetId: 'sumiwatari' },
      } as const,
      { type: 'setSupport', support: 'indicate-safe-route' } as const,
      { type: 'commitRound' } as const,
      { type: 'resolveRound' } as const,
    ]
    for (const command of waterwayCommands) {
      state = executeGameCommand(state, {
        type: 'exploration',
        action: { type: 'waterwayBattleCommand', command },
      })
    }
    expect(state.expedition.phase).toBe('waterway-result')
    state = executeGameCommand(state, {
      type: 'exploration', action: { type: 'flushWaterwayValve' },
    })
    expect(state.expedition).toMatchObject({
      phase: 'waterway-complete',
      towerCompleted: true,
      waterwayCompleted: true,
    })
    expect(state.objective.recordsFound).toBe(2)
    expect(state.objective.valvesRestored).toBe(2)
    expect(
      state.researchUpdates.filter(
        (update) => update.id === 'update-downstream-valve-restored',
      ),
    ).toHaveLength(1)

    for (const action of [
      { type: 'returnToLaboratory' } as const,
      { type: 'startExpedition' } as const,
      { type: 'beginGroveEncounter' } as const,
      { type: 'groveAction', action: 'observeWave' } as const,
      { type: 'groveAction', action: 'stopEmitter' } as const,
      { type: 'groveAction', action: 'offerStableFragment' } as const,
      { type: 'groveAction', action: 'requestCooperation' } as const,
    ]) {
      state = executeGameCommand(state, { type: 'exploration', action })
    }
    expect(state.expedition.phase).toBe('grove-result')
    expect(state.party.reserve[1]).toMatchObject({
      id: 'creature-rekimatoi-grove-001',
      speciesId: 'rekimatoi',
    })

    state = executeGameCommand(state, {
      type: 'exploration', action: { type: 'completeGroveSurvey' },
    })
    expect(state.expedition).toMatchObject({
      phase: 'grove-complete',
      groveCompleted: true,
      relicCatalystObtained: true,
    })
    expect(state.objective.recordsFound).toBe(2)
    expect(state.objective.valvesRestored).toBe(2)
    expect(
      state.researchUpdates.filter(
        (update) => update.id === 'update-filter-grove-stabilized',
      ),
    ).toHaveLength(1)

    state = executeGameCommand(state, {
      type: 'exploration', action: { type: 'returnToLaboratory' },
    })
    state = executeGameCommand(state, {
      type: 'exploration', action: { type: 'startExpedition' },
    })
    expect(state.expedition.phase).toBe('core-preview')

    state = executeGameCommand(state, {
      type: 'exploration', action: { type: 'beginCoreBattle' },
    })
    const runBossCommand = (command: CoreBossBattleCommand) => {
      state = executeGameCommand(state, {
        type: 'exploration', action: { type: 'coreBossCommand', command },
      })
    }
    const resolveBossRound = () => {
      runBossCommand({ type: 'commitRound' })
      runBossCommand({ type: 'resolveRound' })
    }

    runBossCommand({ type: 'setSupport', support: 'observe-outlets' })
    resolveBossRound()
    runBossCommand({ type: 'setSupport', support: 'rekimatoi-left' })
    runBossCommand({
      type: 'setPlan', actorId: 'sumiwatari',
      plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'left-pollution-mass' },
    })
    resolveBossRound()
    runBossCommand({ type: 'setSupport', support: 'rekimatoi-right' })
    runBossCommand({
      type: 'setPlan', actorId: 'sumiwatari',
      plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'right-pollution-mass' },
    })
    resolveBossRound()
    runBossCommand({ type: 'setSupport', support: 'analyze-control' })
    runBossCommand({
      type: 'setPlan', actorId: 'sumiwatari',
      plan: { kind: 'defend', targetId: 'sumiwatari' },
    })
    resolveBossRound()
    runBossCommand({ type: 'setSupport', support: 'open-outlet' })
    resolveBossRound()
    runBossCommand({
      type: 'setPlan', actorId: 'tomoshigoke',
      plan: { kind: 'skill', skillId: 'calming-glimmer', targetId: 'nigorigui' },
    })
    runBossCommand({
      type: 'setPlan', actorId: 'sumiwatari',
      plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'nigorigui' },
    })
    resolveBossRound()
    resolveBossRound()
    resolveBossRound()
    runBossCommand({
      type: 'setPlan', actorId: 'tomoshigoke',
      plan: { kind: 'defend', targetId: 'tomoshigoke' },
    })
    runBossCommand({
      type: 'setPlan', actorId: 'sumiwatari',
      plan: { kind: 'defend', targetId: 'sumiwatari' },
    })
    runBossCommand({ type: 'setSupport', support: 'connect-purification' })
    resolveBossRound()

    expect(state.expedition.phase).toBe('core-result')
    state = executeGameCommand(state, {
      type: 'exploration',
      action: { type: 'selectBossReport', choice: 'record-control-trace' },
    })
    state = executeGameCommand(state, {
      type: 'exploration', action: { type: 'completeRegionReport' },
    })
    expect(state.expedition).toMatchObject({
      phase: 'region-complete',
      regionCompleted: true,
      bossReportChoice: 'record-control-trace',
    })
    expect(state.objective.recordsFound).toBe(3)
    expect(state.objective.valvesRestored).toBe(2)
    expect(
      state.researchUpdates.filter(
        (update) => update.id === 'update-graymoss-region-completed',
      ),
    ).toHaveLength(1)
  })
})
