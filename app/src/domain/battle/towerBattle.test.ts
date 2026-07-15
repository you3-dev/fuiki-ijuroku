import { describe, expect, it } from 'vitest'
import {
  canRequestTowerCooperation,
  createTowerBattleState,
  updateTowerBattle,
} from './towerBattle'

describe('observation tower battle', () => {
  function commitAndResolve(state: ReturnType<typeof createTowerBattleState>) {
    return updateTowerBattle(
      updateTowerBattle(state, { type: 'commitRound' }),
      { type: 'resolveRound' },
    )
  }

  it('records the call only when observing without attacks', () => {
    const battle = commitAndResolve(
      updateTowerBattle(createTowerBattleState(), {
        type: 'setSupport',
        support: 'observe-call',
      }),
    )

    expect(battle.callObserved).toBe(true)
    expect(battle.vigilance).toBe(50)
    expect(battle.round).toBe(2)
    expect(battle.combatants.tomoshigoke.currentHp).toBeLessThan(72)
    expect(battle.combatants.tomoshigoke.vitality).toBe(65)
  })

  it('uses separate support and three ally plans to reach cooperation', () => {
    let battle = createTowerBattleState()
    battle = updateTowerBattle(battle, { type: 'setSupport', support: 'observe-call' })
    battle = commitAndResolve(battle)
    battle = updateTowerBattle(battle, { type: 'setSupport', support: 'calming-chime' })
    battle = updateTowerBattle(battle, {
      type: 'setPlan',
      actorId: 'tomoshigoke',
      plan: { kind: 'skill', skillId: 'calming-glimmer', targetId: 'kirihane' },
    })
    battle = updateTowerBattle(battle, {
      type: 'setPlan',
      actorId: 'numakuguri',
      plan: { kind: 'skill', skillId: 'burrow-guard', targetId: 'tomoshigoke' },
    })
    battle = updateTowerBattle(battle, {
      type: 'setPlan',
      actorId: 'sumiwatari',
      plan: { kind: 'skill', skillId: 'clarifying-flow', targetId: 'tomoshigoke' },
    })
    battle = commitAndResolve(battle)

    expect(canRequestTowerCooperation(battle)).toBe(true)
    expect(battle.vigilance).toBe(10)
    expect(battle.echoedCall).toBe(true)
    expect(battle.calmed).toBe(true)
    expect(battle.combatants.numakuguri.currentHp).toBeLessThan(101)
    expect(battle.combatants.tomoshigoke.currentHp).toBeGreaterThanOrEqual(65)

    battle = updateTowerBattle(battle, {
      type: 'setSupport',
      support: 'request-cooperation',
    })
    battle = commitAndResolve(battle)
    expect(battle.outcome).toBe('cooperation')
  })

  it('commits an entire recommended plan atomically', () => {
    const battle = updateTowerBattle(createTowerBattleState(), {
      type: 'commitRoundWithPlan',
      support: 'observe-call',
      plans: {
        tomoshigoke: { kind: 'defend', targetId: 'tomoshigoke' },
        numakuguri: { kind: 'defend', targetId: 'numakuguri' },
        sumiwatari: { kind: 'defend', targetId: 'sumiwatari' },
      },
    })

    expect(battle.phase).toBe('committed')
    expect(battle.supportPlan).toBe('observe-call')
    expect(battle.plans.tomoshigoke.kind).toBe('defend')
  })

  it('is deterministic for the same saved state and command', () => {
    const state = updateTowerBattle(createTowerBattleState(), {
      type: 'setSupport',
      support: 'observe-call',
    })
    expect(commitAndResolve(state)).toEqual(
      commitAndResolve(state),
    )
  })

  it('does not resolve a committed round twice', () => {
    const committed = updateTowerBattle(createTowerBattleState(), {
      type: 'commitRound',
    })
    const resolved = updateTowerBattle(committed, { type: 'resolveRound' })
    expect(updateTowerBattle(resolved, { type: 'resolveRound' })).toBe(resolved)
  })

  it('intercepts only when Burrow Guard targets the creature being attacked', () => {
    let battle = commitAndResolve(createTowerBattleState())
    battle = updateTowerBattle(battle, {
      type: 'setPlan',
      actorId: 'numakuguri',
      plan: { kind: 'skill', skillId: 'burrow-guard', targetId: 'sumiwatari' },
    })
    const tomoshigokeHp = battle.combatants.tomoshigoke.currentHp
    const numakuguriHp = battle.combatants.numakuguri.currentHp
    battle = commitAndResolve(battle)

    expect(battle.combatants.tomoshigoke.currentHp).toBeLessThan(tomoshigokeHp)
    expect(battle.combatants.numakuguri.currentHp).toBe(numakuguriHp)
  })

  it('restores mist instead of attacking when the mist has dispersed', () => {
    const committed = {
      ...createTowerBattleState(),
      phase: 'committed' as const,
      round: 3,
      mistTurns: 0,
    }
    const resolved = updateTowerBattle(committed, { type: 'resolveRound' })

    expect(resolved.mistTurns).toBe(2)
    expect(resolved.combatants.tomoshigoke.currentHp).toBe(72)
  })
})
