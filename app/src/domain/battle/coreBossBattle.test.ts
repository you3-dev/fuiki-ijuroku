import { describe, expect, it } from 'vitest'
import type {
  AllyCombatantId,
  CoreBossBattleState,
  CoreBossPlanTargetId,
  CoreBossSupport,
} from './types'
import {
  canConnectPurification,
  createCoreBossBattleState,
  updateCoreBossBattle,
} from './coreBossBattle'

describe('purification core boss battle', () => {
  const skillIds = {
    tomoshigoke: 'calming-glimmer',
    numakuguri: 'burrow-guard',
    sumiwatari: 'clarifying-flow',
  } as const

  function setDefend(state: CoreBossBattleState, actorId: AllyCombatantId) {
    return updateCoreBossBattle(state, {
      type: 'setPlan', actorId, plan: { kind: 'defend', targetId: actorId },
    })
  }

  function defendAll(state: CoreBossBattleState) {
    for (const actorId of ['tomoshigoke', 'numakuguri', 'sumiwatari'] as const) {
      state = setDefend(state, actorId)
    }
    return state
  }

  function setSkill(
    state: CoreBossBattleState,
    actorId: AllyCombatantId,
    targetId: CoreBossPlanTargetId,
  ) {
    return updateCoreBossBattle(state, {
      type: 'setPlan',
      actorId,
      plan: { kind: 'skill', skillId: skillIds[actorId], targetId },
    })
  }

  function setSupport(state: CoreBossBattleState, support: CoreBossSupport) {
    return updateCoreBossBattle(state, { type: 'setSupport', support })
  }

  function resolve(state: CoreBossBattleState) {
    return updateCoreBossBattle(
      updateCoreBossBattle(state, { type: 'commitRound' }),
      { type: 'resolveRound' },
    )
  }

  it('secures Nigorigui in the nine-round recommended sequence', () => {
    let battle = createCoreBossBattleState()

    // 1: Observe the blocked outlets without attacking.
    battle = resolve(setSupport(defendAll(battle), 'observe-outlets'))
    expect(battle.outletsObserved).toBe(true)
    expect(battle.overload).toBe(120)

    // 2-3: Rekimatoi removes each armor while Sumiwatari washes the mass away.
    battle = setSkill(defendAll(battle), 'sumiwatari', 'left-pollution-mass')
    battle = resolve(setSupport(battle, 'rekimatoi-left'))
    expect(battle.targets['left-pollution-mass'].currentHp).toBe(0)
    expect(battle.overload).toBe(130)

    battle = setSkill(defendAll(battle), 'sumiwatari', 'right-pollution-mass')
    battle = resolve(setSupport(battle, 'rekimatoi-right'))
    expect(battle.stage).toBe(2)

    // 4-5: Analyze first, then defend the warned burst while opening the outlet.
    battle = resolve(setSupport(defendAll(battle), 'analyze-control'))
    expect(battle.outletProgress).toBe(1)
    expect(battle.burstWarned).toBe(true)

    battle = resolve(setSupport(defendAll(battle), 'open-outlet'))
    expect(battle.stage).toBe(3)
    expect(battle.outletProgress).toBe(2)
    expect(battle.burstWarned).toBe(false)
    expect(battle.overload).toBe(110)
    expect(Object.values(battle.allies).every((ally) => ally.currentHp > 0)).toBe(true)

    // 6-8: Lower overload and vigilance together.
    for (let round = 0; round < 3; round += 1) {
      battle = defendAll(battle)
      battle = setSkill(battle, 'tomoshigoke', 'nigorigui')
      battle = setSkill(battle, 'sumiwatari', 'nigorigui')
      battle = resolve(battle)
    }
    expect(battle.round).toBe(9)
    expect(battle.overload).toBe(20)
    expect(battle.vigilance).toBe(20)
    expect(battle.calmed).toBe(true)
    expect(canConnectPurification(battle)).toBe(true)

    // 9: Connect the purification route; no additional enemy action occurs.
    battle = resolve(setSupport(defendAll(battle), 'connect-purification'))
    expect(battle.outcome).toBe('secured')
    expect(battle.targets.nigorigui.currentHp).toBe(180)
  })

  it('requires observation and Rekimatoi support before a pollution mass can be removed', () => {
    let battle = createCoreBossBattleState()
    const invalidSupport = setSupport(battle, 'rekimatoi-left')
    expect(updateCoreBossBattle(invalidSupport, { type: 'commitRound' })).toBe(invalidSupport)

    battle = updateCoreBossBattle(battle, {
      type: 'setPlan',
      actorId: 'numakuguri',
      plan: { kind: 'basic', targetId: 'left-pollution-mass' },
    })
    battle = setSkill(battle, 'sumiwatari', 'left-pollution-mass')
    battle = resolve(battle)

    expect(battle.targets['left-pollution-mass']).toMatchObject({
      currentHp: 35,
      armored: true,
    })
  })

  it('treats reducing the Nigorigui body to zero HP as ecosystem damage', () => {
    let battle = createCoreBossBattleState()
    battle = {
      ...battle,
      targets: {
        ...battle.targets,
        nigorigui: { ...battle.targets.nigorigui, currentHp: 1 },
      },
    }
    battle = updateCoreBossBattle(battle, {
      type: 'setPlan',
      actorId: 'numakuguri',
      plan: { kind: 'basic', targetId: 'nigorigui' },
    })

    battle = resolve(battle)
    expect(battle.outcome).toBe('ecosystem-damaged')
    expect(battle.vigilance).toBe(100)
  })

  it('ends in party defeat when the warned burst incapacitates every ally', () => {
    let battle = createCoreBossBattleState()
    battle = {
      ...battle,
      stage: 2,
      outletProgress: 1,
      burstWarned: true,
      allies: Object.fromEntries(
        Object.entries(battle.allies).map(([id, ally]) => [id, { ...ally, currentHp: 1 }]),
      ) as CoreBossBattleState['allies'],
    }
    battle = resolve(setSupport(defendAll(battle), 'open-outlet'))

    expect(battle.outcome).toBe('party-defeated')
  })

  it('stores the deterministic seed and never resolves a committed round twice', () => {
    const initial = createCoreBossBattleState()
    const committed = updateCoreBossBattle(initial, { type: 'commitRound' })
    const resolved = updateCoreBossBattle(committed, { type: 'resolveRound' })

    expect(resolved.randomSeed).not.toBe(initial.randomSeed)
    expect(updateCoreBossBattle(resolved, { type: 'resolveRound' })).toBe(resolved)
  })
})
