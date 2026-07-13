export type RegionNodeId =
  | 'marsh-entrance'
  | 'graymoss-shallows'
  | 'observation-tower'
  | 'sunken-waterway'

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
  | { type: 'returnToLaboratory' }

export type ExplorationTransition = {
  expedition: ExpeditionState
  recruitedSumiwatari: boolean
  recruitedKirihane?: boolean
  completedTower?: boolean
}
import type { BattleCommand, TowerBattleState } from '../battle/types'
