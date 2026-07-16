import { describe, expect, it } from 'vitest'
import { advanceExpedition, canRequestCooperation } from './commands'
import { createInitialExpeditionState } from './createInitialExpedition'
import type { ExplorationAction } from './types'

function run(actions: ExplorationAction[]) {
  return actions.reduce(
    (expedition, action) => advanceExpedition(expedition, action).expedition,
    createInitialExpeditionState(),
  )
}

const reachBattle: ExplorationAction[] = [
  { type: 'startExpedition' },
  { type: 'observeEntrance' },
  { type: 'setIntroBattlePlan', actorId: 'tomoshigoke', plan: 'attack' },
  { type: 'setIntroBattlePlan', actorId: 'numakuguri', plan: 'defend' },
  { type: 'resolveIntroBattleRound' },
  { type: 'setIntroBattlePlan', actorId: 'tomoshigoke', plan: 'attack' },
  { type: 'setIntroBattlePlan', actorId: 'numakuguri', plan: 'attack' },
  { type: 'resolveIntroBattleRound' },
  { type: 'setIntroBattlePlan', actorId: 'tomoshigoke', plan: 'attack' },
  { type: 'setIntroBattlePlan', actorId: 'numakuguri', plan: 'attack' },
  { type: 'resolveIntroBattleRound' },
  { type: 'finishIntroBattle' },
  { type: 'enterNode', nodeId: 'graymoss-shallows' },
]

describe('first graymoss expedition', () => {
  it('opens a normal battle after observing and unlocks the shallows after victory', () => {
    const started = run([{ type: 'startExpedition' }])
    expect(started.unlockedNodeIds).not.toContain('graymoss-shallows')

    const observed = advanceExpedition(started, { type: 'observeEntrance' }).expedition
    expect(observed.unlockedNodeIds).not.toContain('graymoss-shallows')
    expect(observed.phase).toBe('intro-battle')

    const completed = run(reachBattle.slice(0, -1))
    expect(completed.phase).toBe('node-choice')
    expect(completed.introBattleCompleted).toBe(true)
    expect(completed.unlockedNodeIds).toContain('graymoss-shallows')
  })

  it('starts the tutorial encounter with vigilance 60 and pollution', () => {
    const expedition = run(reachBattle)
    expect(expedition.battle).toMatchObject({
      round: 1,
      vigilance: 60,
      observed: false,
      polluted: true,
      cleanserCount: 1,
    })
  })

  it('requires observation, defense, cleansing and calming before cooperation', () => {
    const actions: ExplorationAction[] = [
      ...reachBattle,
      { type: 'battleAction', action: 'observe' },
      { type: 'battleAction', action: 'defend' },
      { type: 'battleAction', action: 'cleanse' },
      { type: 'battleAction', action: 'calm' },
    ]
    const expedition = run(actions)
    expect(
      expedition.battle &&
      !('kind' in expedition.battle) &&
      canRequestCooperation(expedition.battle),
    ).toBe(true)
    expect(expedition.battle).toMatchObject({ vigilance: 20, polluted: false, calmed: true })
  })

  it('recruits once and unlocks both first branches', () => {
    const beforeRequest = run([
      ...reachBattle,
      { type: 'battleAction', action: 'observe' },
      { type: 'battleAction', action: 'defend' },
      { type: 'battleAction', action: 'cleanse' },
      { type: 'battleAction', action: 'calm' },
    ])
    const transition = advanceExpedition(beforeRequest, {
      type: 'battleAction',
      action: 'requestCooperation',
    })

    expect(transition.recruitedSumiwatari).toBe(true)
    expect(transition.expedition.firstRecruitmentCompleted).toBe(true)
    expect(transition.expedition.unlockedNodeIds).toEqual(
      expect.arrayContaining(['observation-tower', 'sunken-waterway']),
    )
  })

  it('uses clarifying flow before opening the first branch choice', () => {
    const recruited = run([
      ...reachBattle,
      { type: 'battleAction', action: 'observe' },
      { type: 'battleAction', action: 'defend' },
      { type: 'battleAction', action: 'cleanse' },
      { type: 'battleAction', action: 'calm' },
      { type: 'battleAction', action: 'requestCooperation' },
      { type: 'finishRecruitment' },
    ])
    expect(recruited.phase).toBe('sumi-practice')
    expect(recruited.battle).toMatchObject({
      kind: 'sumi-practice',
      clarifyingFlowUsed: false,
    })

    const completed = [
      { type: 'setSumiPracticePlan', actorId: 'sumiwatari', plan: 'clarifying-flow' },
      { type: 'setSumiPracticePlan', actorId: 'tomoshigoke', plan: 'attack' },
      { type: 'setSumiPracticePlan', actorId: 'numakuguri', plan: 'attack' },
      { type: 'resolveSumiPracticeRound' },
      { type: 'setSumiPracticePlan', actorId: 'tomoshigoke', plan: 'attack' },
      { type: 'setSumiPracticePlan', actorId: 'numakuguri', plan: 'attack' },
      { type: 'setSumiPracticePlan', actorId: 'sumiwatari', plan: 'attack' },
      { type: 'resolveSumiPracticeRound' },
      { type: 'finishSumiPractice' },
    ] as ExplorationAction[]
    const branchChoice = completed.reduce(
      (expedition, action) => advanceExpedition(expedition, action).expedition,
      recruited,
    )
    expect(branchChoice).toMatchObject({
      phase: 'branch-choice',
      sumiPracticeCompleted: true,
      battle: null,
    })
  })
})
