import { describe, expect, it } from 'vitest'
import type { AllyCombatantId, WaterwayBattleState, WaterwayPlanTargetId } from './types'
import {
  canSecureWaterway,
  createWaterwayBattleState,
  updateWaterwayBattle,
} from './waterwayBattle'

describe('sunken waterway battle', () => {
  function setAction(
    state: WaterwayBattleState,
    actorId: AllyCombatantId,
    kind: 'defend' | 'skill',
    targetId: WaterwayPlanTargetId = actorId,
  ) {
    if (kind === 'defend') {
      return updateWaterwayBattle(state, {
        type: 'setPlan', actorId, plan: { kind, targetId: actorId },
      })
    }
    const skillId = {
      tomoshigoke: 'calming-glimmer',
      numakuguri: 'burrow-guard',
      sumiwatari: 'clarifying-flow',
    } as const
    return updateWaterwayBattle(state, {
      type: 'setPlan',
      actorId,
      plan: { kind, skillId: skillId[actorId], targetId },
    })
  }

  function resolve(state: WaterwayBattleState) {
    return updateWaterwayBattle(
      updateWaterwayBattle(state, { type: 'commitRound' }),
      { type: 'resolveRound' },
    )
  }

  function defendAll(state: WaterwayBattleState) {
    for (const actorId of ['tomoshigoke', 'numakuguri', 'sumiwatari'] as const) {
      state = setAction(state, actorId, 'defend')
    }
    return state
  }

  it('rewards observation by cleansing the pollution mass in one use', () => {
    let battle = createWaterwayBattleState('observe-intake')
    battle = setAction(battle, 'tomoshigoke', 'skill', 'polluted-sumiwatari')
    battle = setAction(battle, 'numakuguri', 'skill', 'tomoshigoke')
    battle = setAction(battle, 'sumiwatari', 'skill', 'pollution-mass')
    battle = resolve(battle)

    expect(battle.targets['pollution-mass'].pollution).toBe(0)
    expect(battle.vigilance).toBe(10)
    expect(battle.calmed).toBe(true)
    expect(battle.allies.tomoshigoke.pollution).toBe(0)
    expect(Object.values(battle.plans).every((plan) => plan.kind === 'defend')).toBe(true)
  })

  it('secures the observed route without reducing either target HP', () => {
    let battle = createWaterwayBattleState('observe-intake')
    battle = setAction(battle, 'tomoshigoke', 'skill', 'polluted-sumiwatari')
    battle = setAction(battle, 'numakuguri', 'skill', 'tomoshigoke')
    battle = setAction(battle, 'sumiwatari', 'skill', 'pollution-mass')
    battle = resolve(battle)

    battle = defendAll(battle)
    battle = setAction(battle, 'sumiwatari', 'skill', 'polluted-sumiwatari')
    battle = resolve(battle)
    battle = defendAll(battle)
    battle = setAction(battle, 'sumiwatari', 'skill', 'polluted-sumiwatari')
    battle = resolve(battle)

    expect(canSecureWaterway(battle)).toBe(true)
    battle = defendAll(battle)
    battle = updateWaterwayBattle(battle, {
      type: 'setSupport', support: 'indicate-safe-route',
    })
    battle = resolve(battle)

    expect(battle.outcome).toBe('secured')
    expect(battle.targets['pollution-mass'].currentHp).toBe(50)
    expect(battle.targets['polluted-sumiwatari'].currentHp).toBe(70)
  })

  it('keeps the hurried route difficult but completable', () => {
    let battle = createWaterwayBattleState('hurry-to-valve')
    battle = setAction(battle, 'tomoshigoke', 'skill', 'polluted-sumiwatari')
    battle = setAction(battle, 'sumiwatari', 'skill', 'pollution-mass')
    battle = resolve(battle)
    battle = defendAll(battle)
    battle = setAction(battle, 'tomoshigoke', 'skill', 'polluted-sumiwatari')
    battle = setAction(battle, 'sumiwatari', 'skill', 'pollution-mass')
    battle = resolve(battle)

    battle = defendAll(battle)
    battle = setAction(battle, 'sumiwatari', 'skill', 'sumiwatari')
    battle = resolve(battle)
    battle = resolve(defendAll(battle))
    battle = defendAll(battle)
    battle = setAction(battle, 'sumiwatari', 'skill', 'polluted-sumiwatari')
    battle = resolve(battle)
    battle = resolve(defendAll(battle))
    battle = defendAll(battle)
    battle = setAction(battle, 'sumiwatari', 'skill', 'polluted-sumiwatari')
    battle = resolve(battle)

    expect(canSecureWaterway(battle)).toBe(true)
    battle = defendAll(battle)
    battle = updateWaterwayBattle(battle, {
      type: 'setSupport', support: 'indicate-safe-route',
    })
    expect(resolve(battle).outcome).toBe('secured')
  })

  it('fails safely when direct attacks exhaust a target HP', () => {
    let battle = createWaterwayBattleState('observe-intake')
    battle = {
      ...battle,
      targets: {
        ...battle.targets,
        'pollution-mass': { ...battle.targets['pollution-mass'], currentHp: 1 },
      },
    }
    battle = updateWaterwayBattle(battle, {
      type: 'setPlan',
      actorId: 'tomoshigoke',
      plan: { kind: 'basic', targetId: 'pollution-mass' },
    })
    expect(resolve(battle).outcome).toBe('ecosystem-damaged')
  })

  it('does not resolve a committed round twice', () => {
    const committed = updateWaterwayBattle(
      createWaterwayBattleState('observe-intake'),
      { type: 'commitRound' },
    )
    const resolved = updateWaterwayBattle(committed, { type: 'resolveRound' })
    expect(updateWaterwayBattle(resolved, { type: 'resolveRound' })).toBe(resolved)
  })
})
