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
  | { type: 'returnToLaboratory' }

export type ExplorationTransition = {
  expedition: ExpeditionState
  recruitedSumiwatari: boolean
}
