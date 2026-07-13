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
  { type: 'enterNode', nodeId: 'graymoss-shallows' },
]

describe('first graymoss expedition', () => {
  it('unlocks the shallows only after observing at the entrance', () => {
    const started = run([{ type: 'startExpedition' }])
    expect(started.unlockedNodeIds).not.toContain('graymoss-shallows')

    const observed = advanceExpedition(started, { type: 'observeEntrance' }).expedition
    expect(observed.unlockedNodeIds).toContain('graymoss-shallows')
    expect(observed.phase).toBe('node-choice')
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
    expect(expedition.battle && canRequestCooperation(expedition.battle)).toBe(true)
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
})
