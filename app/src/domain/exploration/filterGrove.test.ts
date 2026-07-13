import { describe, expect, it } from 'vitest'
import { advanceExpedition, canRequestGroveCooperation } from './commands'
import { createInitialExpeditionState } from './createInitialExpedition'

function completedValves() {
  return {
    ...createInitialExpeditionState(),
    firstRecruitmentCompleted: true,
    towerCompleted: true,
    waterwayCompleted: true,
  }
}

describe('filter grove expedition', () => {
  it('unlocks only after both valves are restored', () => {
    const oneValve = {
      ...createInitialExpeditionState(),
      firstRecruitmentCompleted: true,
      towerCompleted: true,
    }
    expect(advanceExpedition(oneValve, { type: 'startExpedition' }).expedition.phase)
      .toBe('branch-choice')

    const grove = advanceExpedition(completedValves(), { type: 'startExpedition' })
      .expedition
    expect(grove).toMatchObject({
      phase: 'grove-event',
      currentNodeId: 'filter-grove',
    })
    expect(grove.unlockedNodeIds).toContain('filter-grove')
  })

  it('requires the safe four-step sequence before cooperation', () => {
    let expedition = advanceExpedition(completedValves(), {
      type: 'startExpedition',
    }).expedition
    expedition = advanceExpedition(expedition, {
      type: 'beginGroveEncounter',
    }).expedition

    const outOfOrder = advanceExpedition(expedition, {
      type: 'groveAction', action: 'stopEmitter',
    }).expedition
    expect(outOfOrder).toBe(expedition)

    for (const action of ['observeWave', 'stopEmitter', 'offerStableFragment'] as const) {
      expedition = advanceExpedition(expedition, {
        type: 'groveAction', action,
      }).expedition
    }
    expect(canRequestGroveCooperation(expedition.groveEncounter)).toBe(true)

    const cooperation = advanceExpedition(expedition, {
      type: 'groveAction', action: 'requestCooperation',
    })
    expect(cooperation.expedition.phase).toBe('grove-result')
    expect(cooperation.recruitedRekimatoi).toBe(true)

    const completed = advanceExpedition(cooperation.expedition, {
      type: 'completeGroveSurvey',
    })
    expect(completed.completedGrove).toBe(true)
    expect(completed.expedition).toMatchObject({
      phase: 'grove-complete',
      groveCompleted: true,
      relicCatalystObtained: true,
    })
    expect(completed.expedition.unlockedNodeIds).toContain('purification-core')
  })

  it('fails safely when the shell is damaged and retries from the checkpoint', () => {
    let expedition = advanceExpedition(completedValves(), {
      type: 'startExpedition',
    }).expedition
    expedition = advanceExpedition(expedition, {
      type: 'beginGroveEncounter',
    }).expedition
    expedition = advanceExpedition(expedition, {
      type: 'groveAction', action: 'damageShell',
    }).expedition

    expect(expedition.groveEncounter?.shellIntact).toBe(false)
    const retried = advanceExpedition(expedition, { type: 'retryGroveEncounter' })
      .expedition
    expect(retried.groveEncounter).toMatchObject({
      round: 1,
      shellIntact: true,
      waveObserved: false,
    })
  })

  it('opens the core preview after the grove survey is complete', () => {
    const expedition = {
      ...completedValves(),
      groveCompleted: true,
      relicCatalystObtained: true,
    }
    const opened = advanceExpedition(expedition, { type: 'startExpedition' })
      .expedition
    expect(opened).toMatchObject({
      phase: 'core-preview',
      currentNodeId: 'purification-core',
    })
  })
})
