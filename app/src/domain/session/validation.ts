import { GAME_SCHEMA_VERSION, type GameSessionState } from './types'
import type { ExpeditionPhase, RegionNodeId } from '../exploration/types'
import { allyIds, combatants, skillDefinitions } from '../battle/data'
import type {
  AllyCombatantId,
  CombatantId,
  WaterwayApproach,
  WaterwayTargetId,
} from '../battle/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown, maxLength?: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    (maxLength === undefined || Array.from(value).length <= maxLength)
  )
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isCreatureSummary(value: unknown): boolean {
  if (value === null) return true
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.speciesId)) return false
  if (!isNonEmptyString(value.displayName) || !isNonEmptyString(value.role)) return false
  if (!Number.isInteger(value.level) || Number(value.level) < 1) return false
  return ['ready', 'resting', 'incapacitated'].includes(String(value.status))
}

function hasUniqueIds(values: unknown[]): boolean {
  const ids = values
    .filter((value) => value !== null)
    .map((value) => (isRecord(value) ? value.id : undefined))
  return ids.every((id) => typeof id === 'string') && new Set(ids).size === ids.length
}

const REGION_NODE_IDS: RegionNodeId[] = [
  'marsh-entrance',
  'graymoss-shallows',
  'observation-tower',
  'sunken-waterway',
]

const EXPEDITION_PHASES: ExpeditionPhase[] = [
  'idle',
  'entrance',
  'node-choice',
  'battle',
  'recruit-result',
  'branch-choice',
  'branch-selected',
  'tower-event',
  'tower-battle',
  'tower-result',
  'tower-complete',
  'waterway-event',
  'waterway-battle',
  'waterway-result',
  'waterway-complete',
]

function isRegionNodeId(value: unknown): value is RegionNodeId {
  return REGION_NODE_IDS.includes(value as RegionNodeId)
}

function isTutorialBattle(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!Number.isInteger(value.round) || Number(value.round) < 1) return false
  if (!isNonNegativeInteger(value.vigilance) || Number(value.vigilance) > 100) return false
  if (typeof value.observed !== 'boolean') return false
  if (typeof value.pressureDefended !== 'boolean') return false
  if (typeof value.polluted !== 'boolean') return false
  if (!isNonNegativeInteger(value.cleanserCount) || Number(value.cleanserCount) > 1) {
    return false
  }
  if (typeof value.calmed !== 'boolean') return false
  return ['encountered', 'observed', 'defended', 'cleansed', 'calmed'].includes(
    String(value.lastAction),
  )
}

const COMBATANT_IDS: CombatantId[] = [
  'tomoshigoke',
  'numakuguri',
  'sumiwatari',
  'kirihane',
]

function isBattlePlan(value: unknown, actorId: AllyCombatantId): boolean {
  if (!isRecord(value) || !['basic', 'defend', 'skill'].includes(String(value.kind))) {
    return false
  }
  if (!COMBATANT_IDS.includes(value.targetId as CombatantId)) return false
  if (value.kind === 'basic') return value.targetId === 'kirihane'
  if (value.kind === 'defend') return value.targetId === actorId
  if (value.kind === 'skill') {
    if (!isNonEmptyString(value.skillId)) return false
    const skill = skillDefinitions[value.skillId as keyof typeof skillDefinitions]
    if (!skill || skill.actorId !== actorId) return false
    if (value.skillId === 'calming-glimmer') return value.targetId === 'kirihane'
    if (value.skillId === 'burrow-guard') {
      return allyIds.includes(value.targetId as AllyCombatantId) && value.targetId !== actorId
    }
    return allyIds.includes(value.targetId as AllyCombatantId)
  }
  return false
}

function isTowerBattle(value: unknown): boolean {
  if (!isRecord(value) || value.kind !== 'observation-tower') return false
  if (!['planning', 'committed'].includes(String(value.phase))) return false
  if (!Number.isInteger(value.round) || Number(value.round) < 1) return false
  if (!isNonNegativeInteger(value.randomSeed)) return false
  if (!isRecord(value.combatants)) return false
  for (const id of COMBATANT_IDS) {
    const unit = value.combatants[id]
    if (!isRecord(unit) || unit.id !== id) return false
    if (!isNonNegativeInteger(unit.currentHp)) return false
    if (Number(unit.currentHp) > combatants[id].maxHp) return false
    if (!isNonNegativeInteger(unit.vitality) || Number(unit.vitality) > 100) return false
    if (typeof unit.guarding !== 'boolean') return false
  }
  if (!isRecord(value.plans)) return false
  const plans = value.plans
  if (!allyIds.every((id) => isBattlePlan(plans[id], id))) return false
  if (
    !['none', 'observe-call', 'calming-chime', 'request-cooperation'].includes(
      String(value.supportPlan),
    )
  ) {
    return false
  }
  if (!isNonNegativeInteger(value.mistTurns) || Number(value.mistTurns) > 3) return false
  if (!isNonNegativeInteger(value.vigilance) || Number(value.vigilance) > 100) return false
  if (typeof value.callObserved !== 'boolean') return false
  if (typeof value.echoedCall !== 'boolean') return false
  if (typeof value.calmed !== 'boolean') return false
  if (
    !['ongoing', 'cooperation', 'enemy-defeated', 'party-defeated'].includes(
      String(value.outcome),
    )
  ) {
    return false
  }
  return Array.isArray(value.lastLog) && value.lastLog.every((line) => typeof line === 'string')
}

const WATERWAY_TARGET_IDS: WaterwayTargetId[] = [
  'pollution-mass',
  'polluted-sumiwatari',
]
const WATERWAY_APPROACHES: WaterwayApproach[] = [
  'observe-intake',
  'hurry-to-valve',
]

function isWaterwayPlan(value: unknown, actorId: AllyCombatantId): boolean {
  if (!isRecord(value) || !['basic', 'defend', 'skill'].includes(String(value.kind))) {
    return false
  }
  if (value.kind === 'basic') {
    return WATERWAY_TARGET_IDS.includes(value.targetId as WaterwayTargetId)
  }
  if (value.kind === 'defend') return value.targetId === actorId
  if (!isNonEmptyString(value.skillId)) return false
  const skill = skillDefinitions[value.skillId as keyof typeof skillDefinitions]
  if (!skill || skill.actorId !== actorId) return false
  if (value.skillId === 'calming-glimmer') {
    return value.targetId === 'polluted-sumiwatari'
  }
  if (value.skillId === 'burrow-guard') {
    return allyIds.includes(value.targetId as AllyCombatantId) && value.targetId !== actorId
  }
  return (
    allyIds.includes(value.targetId as AllyCombatantId) ||
    WATERWAY_TARGET_IDS.includes(value.targetId as WaterwayTargetId)
  )
}

function isWaterwayBattle(value: unknown): boolean {
  if (!isRecord(value) || value.kind !== 'sunken-waterway') return false
  if (!['planning', 'committed'].includes(String(value.phase))) return false
  if (!Number.isInteger(value.round) || Number(value.round) < 1) return false
  if (!isNonNegativeInteger(value.randomSeed)) return false
  if (!WATERWAY_APPROACHES.includes(value.approach as WaterwayApproach)) return false
  if (!isRecord(value.allies)) return false
  for (const id of allyIds) {
    const ally = value.allies[id]
    if (!isRecord(ally) || ally.id !== id) return false
    if (!isNonNegativeInteger(ally.currentHp) || Number(ally.currentHp) > combatants[id].maxHp) {
      return false
    }
    if (!isNonNegativeInteger(ally.vitality) || Number(ally.vitality) > 100) return false
    if (!isNonNegativeInteger(ally.pollution) || Number(ally.pollution) > 3) return false
    if (typeof ally.guarding !== 'boolean') return false
  }
  if (!isRecord(value.targets)) return false
  const maxHp: Record<WaterwayTargetId, number> = {
    'pollution-mass': 50,
    'polluted-sumiwatari': 70,
  }
  for (const id of WATERWAY_TARGET_IDS) {
    const target = value.targets[id]
    if (!isRecord(target) || target.id !== id) return false
    if (!isNonNegativeInteger(target.currentHp) || Number(target.currentHp) > maxHp[id]) {
      return false
    }
    if (!isNonNegativeInteger(target.pollution) || Number(target.pollution) > 100) {
      return false
    }
  }
  if (!isRecord(value.plans)) return false
  if (!allyIds.every((id) => isWaterwayPlan((value.plans as Record<string, unknown>)[id], id))) {
    return false
  }
  if (!['none', 'indicate-safe-route'].includes(String(value.supportPlan))) return false
  if (!isNonNegativeInteger(value.vigilance) || Number(value.vigilance) > 100) return false
  if (typeof value.calmed !== 'boolean' || typeof value.observedSource !== 'boolean') {
    return false
  }
  if (
    !['ongoing', 'secured', 'ecosystem-damaged', 'party-defeated'].includes(
      String(value.outcome),
    )
  ) {
    return false
  }
  return Array.isArray(value.lastLog) && value.lastLog.every((line) => typeof line === 'string')
}

function isExpeditionState(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!EXPEDITION_PHASES.includes(value.phase as ExpeditionPhase)) return false
  if (value.currentNodeId !== null && !isRegionNodeId(value.currentNodeId)) return false
  if (!Array.isArray(value.unlockedNodeIds)) return false
  if (!value.unlockedNodeIds.every(isRegionNodeId)) return false
  if (new Set(value.unlockedNodeIds).size !== value.unlockedNodeIds.length) return false
  if (typeof value.entryObserved !== 'boolean') return false
  if (typeof value.firstRecruitmentCompleted !== 'boolean') return false
  if (typeof value.towerCompleted !== 'boolean') return false
  if (typeof value.waterwayCompleted !== 'boolean') return false
  if (
    value.waterwayApproach !== null &&
    !WATERWAY_APPROACHES.includes(value.waterwayApproach as WaterwayApproach)
  ) {
    return false
  }
  if (
    value.selectedBranchId !== null &&
    value.selectedBranchId !== 'observation-tower' &&
    value.selectedBranchId !== 'sunken-waterway'
  ) {
    return false
  }
  switch (value.phase) {
    case 'idle':
      return (
        value.currentNodeId === null &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'entrance':
      return (
        value.currentNodeId === 'marsh-entrance' &&
        value.firstRecruitmentCompleted === false &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'node-choice':
      return (
        value.currentNodeId === 'marsh-entrance' &&
        value.entryObserved === true &&
        value.unlockedNodeIds.includes('graymoss-shallows') &&
        value.firstRecruitmentCompleted === false &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'battle':
      return (
        value.currentNodeId === 'graymoss-shallows' &&
        value.firstRecruitmentCompleted === false &&
        isTutorialBattle(value.battle) &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'recruit-result':
      return (
        value.currentNodeId === 'graymoss-shallows' &&
        value.firstRecruitmentCompleted === true &&
        value.unlockedNodeIds.includes('observation-tower') &&
        value.unlockedNodeIds.includes('sunken-waterway') &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'branch-choice':
      return (
        value.currentNodeId === 'graymoss-shallows' &&
        value.firstRecruitmentCompleted === true &&
        value.unlockedNodeIds.includes('observation-tower') &&
        value.unlockedNodeIds.includes('sunken-waterway') &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'branch-selected':
      return (
        value.firstRecruitmentCompleted === true &&
        value.selectedBranchId === 'sunken-waterway' &&
        value.currentNodeId === value.selectedBranchId &&
        value.unlockedNodeIds.includes(value.selectedBranchId) &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'tower-event':
      return (
        value.firstRecruitmentCompleted === true &&
        value.towerCompleted === false &&
        value.currentNodeId === 'observation-tower' &&
        value.selectedBranchId === 'observation-tower' &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'tower-battle':
      return (
        value.firstRecruitmentCompleted === true &&
        value.towerCompleted === false &&
        value.currentNodeId === 'observation-tower' &&
        value.selectedBranchId === 'observation-tower' &&
        value.battle === null &&
        isTowerBattle(value.towerBattle) &&
        value.waterwayBattle === null &&
        (value.towerBattle as Record<string, unknown>).outcome !== 'cooperation'
      )
    case 'tower-result':
      return (
        value.firstRecruitmentCompleted === true &&
        value.towerCompleted === false &&
        value.currentNodeId === 'observation-tower' &&
        value.selectedBranchId === 'observation-tower' &&
        value.battle === null &&
        isTowerBattle(value.towerBattle) &&
        value.waterwayBattle === null &&
        (value.towerBattle as Record<string, unknown>).outcome === 'cooperation'
      )
    case 'tower-complete':
      return (
        value.firstRecruitmentCompleted === true &&
        value.towerCompleted === true &&
        value.currentNodeId === 'observation-tower' &&
        value.selectedBranchId === 'observation-tower' &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'waterway-event':
      return (
        value.firstRecruitmentCompleted === true &&
        value.waterwayCompleted === false &&
        value.currentNodeId === 'sunken-waterway' &&
        value.selectedBranchId === 'sunken-waterway' &&
        value.waterwayApproach === null &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    case 'waterway-battle':
      return (
        value.firstRecruitmentCompleted === true &&
        value.waterwayCompleted === false &&
        value.currentNodeId === 'sunken-waterway' &&
        value.selectedBranchId === 'sunken-waterway' &&
        WATERWAY_APPROACHES.includes(value.waterwayApproach as WaterwayApproach) &&
        value.battle === null &&
        value.towerBattle === null &&
        isWaterwayBattle(value.waterwayBattle) &&
        (value.waterwayBattle as Record<string, unknown>).approach === value.waterwayApproach &&
        (value.waterwayBattle as Record<string, unknown>).outcome !== 'secured'
      )
    case 'waterway-result':
      return (
        value.firstRecruitmentCompleted === true &&
        value.waterwayCompleted === false &&
        value.currentNodeId === 'sunken-waterway' &&
        value.selectedBranchId === 'sunken-waterway' &&
        WATERWAY_APPROACHES.includes(value.waterwayApproach as WaterwayApproach) &&
        value.battle === null &&
        value.towerBattle === null &&
        isWaterwayBattle(value.waterwayBattle) &&
        (value.waterwayBattle as Record<string, unknown>).outcome === 'secured'
      )
    case 'waterway-complete':
      return (
        value.firstRecruitmentCompleted === true &&
        value.waterwayCompleted === true &&
        value.currentNodeId === 'sunken-waterway' &&
        value.selectedBranchId === 'sunken-waterway' &&
        value.battle === null &&
        value.towerBattle === null &&
        value.waterwayBattle === null
      )
    default:
      return false
  }
}

export function isGameSessionState(value: unknown): value is GameSessionState {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== GAME_SCHEMA_VERSION) return false
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) return false
  if (!isRecord(value.profile) || value.profile.id !== 'primary') return false
  if (!isNonEmptyString(value.profile.name, 20)) return false
  if (!isNonEmptyString(value.profile.createdAt)) return false
  if (Number.isNaN(Date.parse(value.profile.createdAt))) return false
  if (!isRecord(value.objective)) return false
  if (!isNonEmptyString(value.objective.id)) return false
  if (!isNonEmptyString(value.objective.regionId)) return false
  if (!isNonEmptyString(value.objective.title)) return false
  if (!isNonEmptyString(value.objective.summary)) return false
  if (!isNonNegativeInteger(value.objective.recordsFound)) return false
  if (!isNonNegativeInteger(value.objective.recordsTotal)) return false
  if (Number(value.objective.recordsFound) > Number(value.objective.recordsTotal)) {
    return false
  }
  if (!isNonNegativeInteger(value.objective.valvesRestored)) return false
  if (!isNonNegativeInteger(value.objective.valvesTotal)) return false
  if (Number(value.objective.valvesRestored) > Number(value.objective.valvesTotal)) {
    return false
  }
  if (typeof value.objective.preparationRecorded !== 'boolean') return false
  if (!isRecord(value.party)) return false
  if (!Array.isArray(value.party.front) || value.party.front.length !== 3) return false
  if (!Array.isArray(value.party.reserve) || value.party.reserve.length !== 3) {
    return false
  }
  const partySlots = [...value.party.front, ...value.party.reserve]
  if (!partySlots.every(isCreatureSummary) || !hasUniqueIds(partySlots)) return false
  if (!Array.isArray(value.researchUpdates)) return false
  if (
    !value.researchUpdates.every(
      (update) =>
        isRecord(update) &&
        isNonEmptyString(update.id) &&
        isNonEmptyString(update.title) &&
        isNonEmptyString(update.detail) &&
        typeof update.acknowledged === 'boolean',
    )
  ) {
    return false
  }
  if (!hasUniqueIds(value.researchUpdates)) return false
  if (!isExpeditionState(value.expedition)) return false
  const hasTutorialSumiwatari = partySlots.some(
    (creature) =>
      isRecord(creature) && creature.id === 'creature-sumiwatari-tutorial-001',
  )
  if (
    (value.expedition as Record<string, unknown>).firstRecruitmentCompleted !==
    hasTutorialSumiwatari
  ) {
    return false
  }
  const hasTowerKirihane = partySlots.some(
    (creature) => isRecord(creature) && creature.id === 'creature-kirihane-tower-001',
  )
  const expeditionRecord = value.expedition as Record<string, unknown>
  const expectsTowerKirihane =
    expeditionRecord.phase === 'tower-result' || expeditionRecord.towerCompleted === true
  if (hasTowerKirihane !== expectsTowerKirihane) return false
  const completedRoutes =
    Number(expeditionRecord.towerCompleted === true) +
    Number(expeditionRecord.waterwayCompleted === true)
  if (
    Number(value.objective.recordsFound) < completedRoutes ||
    Number(value.objective.valvesRestored) < completedRoutes
  ) {
    return false
  }
  if (!isRecord(value.settings)) return false
  if (typeof value.settings.soundEnabled !== 'boolean') return false
  if (typeof value.settings.reduceMotion !== 'boolean') return false
  return true
}
