import { describe, expect, it } from 'vitest'
import { createSumiPracticeBattleState } from './createInitialExpedition'
import {
  canResolveSumiPracticeRound,
  canSetSumiPracticePlan,
  resolveSumiPracticeRound,
  setSumiPracticePlan,
} from './sumiPracticeBattle'

describe('Sumiwatari practice battle', () => {
  it('requires Sumiwatari to use clarifying flow while an ally is polluted', () => {
    const battle = createSumiPracticeBattleState()
    expect(canSetSumiPracticePlan(battle, 'sumiwatari', 'attack')).toBe(false)
    expect(canSetSumiPracticePlan(battle, 'sumiwatari', 'defend')).toBe(false)
    expect(canSetSumiPracticePlan(battle, 'sumiwatari', 'clarifying-flow')).toBe(true)
  })

  it('cleanses pollution, heals, and then opens ordinary Sumiwatari commands', () => {
    let battle = createSumiPracticeBattleState()
    battle = setSumiPracticePlan(battle, 'sumiwatari', 'clarifying-flow')
    battle = setSumiPracticePlan(battle, 'tomoshigoke', 'attack')
    battle = setSumiPracticePlan(battle, 'numakuguri', 'attack')
    expect(canResolveSumiPracticeRound(battle)).toBe(true)

    const resolved = resolveSumiPracticeRound(battle)
    expect(resolved).toMatchObject({ round: 2, enemyHp: 40, clarifyingFlowUsed: true })
    expect(resolved.allies.tomoshigoke).toMatchObject({ currentHp: 60, polluted: false })
    expect(canSetSumiPracticePlan(resolved, 'sumiwatari', 'attack')).toBe(true)
  })

  it('wins the second round with all three basic attacks', () => {
    let battle = createSumiPracticeBattleState()
    for (const [actorId, plan] of [
      ['sumiwatari', 'clarifying-flow'],
      ['tomoshigoke', 'attack'],
      ['numakuguri', 'attack'],
    ] as const) {
      battle = setSumiPracticePlan(battle, actorId, plan)
    }
    battle = resolveSumiPracticeRound(battle)
    for (const actorId of ['tomoshigoke', 'numakuguri', 'sumiwatari'] as const) {
      battle = setSumiPracticePlan(battle, actorId, 'attack')
    }
    battle = resolveSumiPracticeRound(battle)

    expect(battle.outcome).toBe('victory')
    expect(battle.enemyHp).toBe(0)
    expect(battle.lastLog.at(-1)).toContain('湿原の奥へ退いた')
  })
})
