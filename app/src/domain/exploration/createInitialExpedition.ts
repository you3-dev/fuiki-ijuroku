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
