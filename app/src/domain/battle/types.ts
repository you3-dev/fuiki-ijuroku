export type AllyCombatantId = 'tomoshigoke' | 'numakuguri' | 'sumiwatari'
export type EnemyCombatantId = 'kirihane'
export type CombatantId = AllyCombatantId | EnemyCombatantId

export type BattleSkillId = 'calming-glimmer' | 'burrow-guard' | 'clarifying-flow'

export type PlannedAction =
  | { kind: 'basic'; targetId: EnemyCombatantId }
  | { kind: 'defend'; targetId: AllyCombatantId }
  | { kind: 'skill'; skillId: BattleSkillId; targetId: CombatantId }

export type ProtagonistSupport =
  | 'none'
  | 'observe-call'
  | 'calming-chime'
  | 'request-cooperation'

export type CombatantState = {
  id: CombatantId
  currentHp: number
  vitality: number
  guarding: boolean
}

export type BattleOutcome =
  | 'ongoing'
  | 'cooperation'
  | 'enemy-defeated'
  | 'party-defeated'

export type TowerBattleState = {
  kind: 'observation-tower'
  phase: 'planning' | 'committed'
  round: number
  randomSeed: number
  combatants: Record<CombatantId, CombatantState>
  plans: Record<AllyCombatantId, PlannedAction>
  supportPlan: ProtagonistSupport
  mistTurns: number
  vigilance: number
  callObserved: boolean
  echoedCall: boolean
  calmed: boolean
  outcome: BattleOutcome
  lastLog: string[]
}

export type BattleCommand =
  | { type: 'setSupport'; support: ProtagonistSupport }
  | { type: 'setPlan'; actorId: AllyCombatantId; plan: PlannedAction }
  | {
      type: 'commitRoundWithPlan'
      support: ProtagonistSupport
      plans: Record<AllyCombatantId, PlannedAction>
    }
  | { type: 'commitRound' }
  | { type: 'resolveRound' }

export type WaterwayTargetId = 'pollution-mass' | 'polluted-sumiwatari'
export type WaterwayPlanTargetId = AllyCombatantId | WaterwayTargetId
export type WaterwayApproach = 'observe-intake' | 'hurry-to-valve'

export type WaterwayPlannedAction =
  | { kind: 'basic'; targetId: WaterwayTargetId }
  | { kind: 'defend'; targetId: AllyCombatantId }
  | { kind: 'skill'; skillId: BattleSkillId; targetId: WaterwayPlanTargetId }

export type WaterwaySupport = 'none' | 'indicate-safe-route'

export type WaterwayTargetState = {
  id: WaterwayTargetId
  currentHp: number
  pollution: number
}

export type WaterwayBattleOutcome =
  | 'ongoing'
  | 'secured'
  | 'ecosystem-damaged'
  | 'party-defeated'

export type WaterwayBattleState = {
  kind: 'sunken-waterway'
  phase: 'planning' | 'committed'
  round: number
  randomSeed: number
  approach: WaterwayApproach
  allies: Record<AllyCombatantId, CombatantState & { pollution: number }>
  targets: Record<WaterwayTargetId, WaterwayTargetState>
  plans: Record<AllyCombatantId, WaterwayPlannedAction>
  supportPlan: WaterwaySupport
  vigilance: number
  calmed: boolean
  observedSource: boolean
  outcome: WaterwayBattleOutcome
  lastLog: string[]
}

export type WaterwayBattleCommand =
  | { type: 'setSupport'; support: WaterwaySupport }
  | {
      type: 'setPlan'
      actorId: AllyCombatantId
      plan: WaterwayPlannedAction
    }
  | { type: 'commitRound' }
  | { type: 'resolveRound' }

export type CoreBossTargetId =
  | 'nigorigui'
  | 'left-pollution-mass'
  | 'right-pollution-mass'

export type CoreBossPlanTargetId = AllyCombatantId | CoreBossTargetId

export type CoreBossPlannedAction =
  | { kind: 'basic'; targetId: CoreBossTargetId }
  | { kind: 'defend'; targetId: AllyCombatantId }
  | { kind: 'skill'; skillId: BattleSkillId; targetId: CoreBossPlanTargetId }

export type CoreBossSupport =
  | 'none'
  | 'observe-outlets'
  | 'rekimatoi-left'
  | 'rekimatoi-right'
  | 'analyze-control'
  | 'open-outlet'
  | 'connect-purification'

export type CoreBossTargetState = {
  id: CoreBossTargetId
  currentHp: number
  armored: boolean
}

export type CoreBossBattleOutcome =
  | 'ongoing'
  | 'secured'
  | 'ecosystem-damaged'
  | 'party-defeated'

export type CoreBossBattleState = {
  kind: 'purification-core'
  phase: 'planning' | 'committed'
  round: number
  randomSeed: number
  stage: 1 | 2 | 3
  allies: Record<AllyCombatantId, CombatantState & { pollution: number }>
  targets: Record<CoreBossTargetId, CoreBossTargetState>
  plans: Record<AllyCombatantId, CoreBossPlannedAction>
  supportPlan: CoreBossSupport
  outletsObserved: boolean
  outletProgress: 0 | 1 | 2
  burstWarned: boolean
  overload: number
  vigilance: number
  calmed: boolean
  outcome: CoreBossBattleOutcome
  lastLog: string[]
}

export type CoreBossBattleCommand =
  | { type: 'setSupport'; support: CoreBossSupport }
  | {
      type: 'setPlan'
      actorId: AllyCombatantId
      plan: CoreBossPlannedAction
    }
  | { type: 'commitRound' }
  | { type: 'resolveRound' }
