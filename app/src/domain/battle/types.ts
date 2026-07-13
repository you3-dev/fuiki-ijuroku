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
  | { type: 'commitRound' }
  | { type: 'resolveRound' }
