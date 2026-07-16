import type {
  ExpeditionState,
  IntroBattleState,
  SumiPracticeBattleState,
  TutorialBattleState,
} from './types'

export function createInitialExpeditionState(): ExpeditionState {
  return {
    phase: 'idle',
    currentNodeId: null,
    unlockedNodeIds: ['marsh-entrance'],
    entryObserved: false,
    introBattleCompleted: false,
    sumiPracticeCompleted: false,
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
    coreBossBattle: null,
    bossReportChoice: null,
    regionCompleted: false,
  }
}

export function createSumiPracticeBattleState(): SumiPracticeBattleState {
  return {
    kind: 'sumi-practice',
    round: 1,
    enemyHp: 70,
    enemyMaxHp: 70,
    allies: {
      tomoshigoke: {
        currentHp: 52,
        maxHp: 72,
        vitality: 45,
        polluted: true,
      },
      numakuguri: {
        currentHp: 108,
        maxHp: 108,
        vitality: 50,
        polluted: false,
      },
      sumiwatari: {
        currentHp: 80,
        maxHp: 80,
        vitality: 50,
        polluted: false,
      },
    },
    plans: { tomoshigoke: null, numakuguri: null, sumiwatari: null },
    clarifyingFlowUsed: false,
    outcome: 'ongoing',
    lastLog: ['汚染をまとったキリハネの飛沫が、トモシゴケへ付着しています。'],
  }
}

export function createIntroBattleState(): IntroBattleState {
  return {
    kind: 'intro-normal',
    round: 1,
    enemyHp: 62,
    enemyMaxHp: 62,
    allies: {
      tomoshigoke: { currentHp: 72, maxHp: 72, vitality: 40 },
      numakuguri: { currentHp: 108, maxHp: 108, vitality: 40 },
    },
    plans: { tomoshigoke: null, numakuguri: null },
    outcome: 'ongoing',
    lastLog: ['若いキリハネが、霧を振り払って進路を塞ぎました。'],
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
