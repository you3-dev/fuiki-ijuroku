export type RegionNodeId =
  | 'marsh-entrance'
  | 'graymoss-shallows'
  | 'observation-tower'
  | 'sunken-waterway'
  | 'filter-grove'
  | 'purification-core'

export type ExpeditionPhase =
  | 'idle'
  | 'entrance'
  | 'node-choice'
  | 'battle'
  | 'recruit-result'
  | 'branch-choice'
  | 'branch-selected'
  | 'tower-event'
  | 'tower-battle'
  | 'tower-result'
  | 'tower-complete'
  | 'waterway-event'
  | 'waterway-battle'
  | 'waterway-result'
  | 'waterway-complete'
  | 'grove-event'
  | 'grove-encounter'
  | 'grove-result'
  | 'grove-complete'
  | 'core-preview'
  | 'core-battle'
  | 'core-result'
  | 'region-complete'

export type TutorialBattleState = {
  round: number
  vigilance: number
  observed: boolean
  pressureDefended: boolean
  polluted: boolean
  cleanserCount: number
  calmed: boolean
  lastAction:
    | 'encountered'
    | 'observed'
    | 'defended'
    | 'cleansed'
    | 'calmed'
}

export type GroveEncounterState = {
  round: number
  vigilance: number
  waveObserved: boolean
  emitterStopped: boolean
  stableFragmentOffered: boolean
  shellIntact: boolean
  lastAction:
    | 'encountered'
    | 'wave-observed'
    | 'emitter-stopped'
    | 'fragment-offered'
    | 'shell-damaged'
}

export type BossReportChoice =
  | 'record-cooperation'
  | 'record-facility-risk'
  | 'record-control-trace'

export type ExpeditionState = {
  phase: ExpeditionPhase
  currentNodeId: RegionNodeId | null
  unlockedNodeIds: RegionNodeId[]
  entryObserved: boolean
  firstRecruitmentCompleted: boolean
  selectedBranchId: 'observation-tower' | 'sunken-waterway' | null
  battle: TutorialBattleState | null
  towerBattle: TowerBattleState | null
  towerCompleted: boolean
  waterwayApproach: WaterwayApproach | null
  waterwayBattle: WaterwayBattleState | null
  waterwayCompleted: boolean
  groveEncounter: GroveEncounterState | null
  groveCompleted: boolean
  relicCatalystObtained: boolean
  coreBossBattle: CoreBossBattleState | null
  bossReportChoice: BossReportChoice | null
  regionCompleted: boolean
}

export type ExplorationAction =
  | { type: 'startExpedition' }
  | { type: 'observeEntrance' }
  | { type: 'enterNode'; nodeId: RegionNodeId }
  | {
      type: 'battleAction'
      action: 'observe' | 'defend' | 'cleanse' | 'calm' | 'requestCooperation'
    }
  | { type: 'finishRecruitment' }
  | { type: 'beginTowerEncounter' }
  | { type: 'towerBattleCommand'; command: BattleCommand }
  | { type: 'retryTowerEncounter' }
  | { type: 'alignTowerReflector' }
  | { type: 'selectWaterwayApproach'; approach: WaterwayApproach }
  | { type: 'waterwayBattleCommand'; command: WaterwayBattleCommand }
  | { type: 'retryWaterwayEncounter' }
  | { type: 'flushWaterwayValve' }
  | { type: 'beginGroveEncounter' }
  | {
      type: 'groveAction'
      action:
        | 'observeWave'
        | 'stopEmitter'
        | 'offerStableFragment'
        | 'damageShell'
        | 'requestCooperation'
    }
  | { type: 'retryGroveEncounter' }
  | { type: 'completeGroveSurvey' }
  | { type: 'beginCoreBattle' }
  | { type: 'coreBossCommand'; command: CoreBossBattleCommand }
  | { type: 'retryCoreBoss' }
  | { type: 'selectBossReport'; choice: BossReportChoice }
  | { type: 'completeRegionReport' }
  | { type: 'returnToLaboratory' }

export type ExplorationTransition = {
  expedition: ExpeditionState
  recruitedSumiwatari: boolean
  recruitedKirihane?: boolean
  completedTower?: boolean
  completedWaterway?: boolean
  recruitedRekimatoi?: boolean
  completedGrove?: boolean
  completedRegion?: boolean
}
import type {
  BattleCommand,
  TowerBattleState,
  WaterwayApproach,
  WaterwayBattleCommand,
  WaterwayBattleState,
  CoreBossBattleCommand,
  CoreBossBattleState,
} from '../battle/types'
