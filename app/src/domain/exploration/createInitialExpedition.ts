import type { ExpeditionState, TutorialBattleState } from './types'

export function createInitialExpeditionState(): ExpeditionState {
  return {
    phase: 'idle',
    currentNodeId: null,
    unlockedNodeIds: ['marsh-entrance'],
    entryObserved: false,
    firstRecruitmentCompleted: false,
    selectedBranchId: null,
    battle: null,
    towerBattle: null,
    towerCompleted: false,
    waterwayApproach: null,
    waterwayBattle: null,
    waterwayCompleted: false,
    groveEncounter: null,
    groveCompleted: false,
    relicCatalystObtained: false,
  }
}

export function createGroveEncounterState(): import('./types').GroveEncounterState {
  return {
    round: 1,
    vigilance: 50,
    waveObserved: false,
    emitterStopped: false,
    stableFragmentOffered: false,
    shellIntact: true,
    lastAction: 'encountered',
  }
}

export function createTutorialBattleState(): TutorialBattleState {
  return {
    round: 1,
    vigilance: 60,
    observed: false,
    pressureDefended: false,
    polluted: true,
    cleanserCount: 1,
    calmed: false,
    lastAction: 'encountered',
  }
}
