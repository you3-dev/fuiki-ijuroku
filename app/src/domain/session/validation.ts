import { GAME_SCHEMA_VERSION, type GameSessionState } from './types'
import type { ExpeditionPhase, RegionNodeId } from '../exploration/types'

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

function isExpeditionState(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (!EXPEDITION_PHASES.includes(value.phase as ExpeditionPhase)) return false
  if (value.currentNodeId !== null && !isRegionNodeId(value.currentNodeId)) return false
  if (!Array.isArray(value.unlockedNodeIds)) return false
  if (!value.unlockedNodeIds.every(isRegionNodeId)) return false
  if (new Set(value.unlockedNodeIds).size !== value.unlockedNodeIds.length) return false
  if (typeof value.entryObserved !== 'boolean') return false
  if (typeof value.firstRecruitmentCompleted !== 'boolean') return false
  if (
    value.selectedBranchId !== null &&
    value.selectedBranchId !== 'observation-tower' &&
    value.selectedBranchId !== 'sunken-waterway'
  ) {
    return false
  }
  switch (value.phase) {
    case 'idle':
      return value.currentNodeId === null && value.battle === null
    case 'entrance':
      return (
        value.currentNodeId === 'marsh-entrance' &&
        value.firstRecruitmentCompleted === false &&
        value.battle === null
      )
    case 'node-choice':
      return (
        value.currentNodeId === 'marsh-entrance' &&
        value.entryObserved === true &&
        value.unlockedNodeIds.includes('graymoss-shallows') &&
        value.firstRecruitmentCompleted === false &&
        value.battle === null
      )
    case 'battle':
      return (
        value.currentNodeId === 'graymoss-shallows' &&
        value.firstRecruitmentCompleted === false &&
        isTutorialBattle(value.battle)
      )
    case 'recruit-result':
      return (
        value.currentNodeId === 'graymoss-shallows' &&
        value.firstRecruitmentCompleted === true &&
        value.unlockedNodeIds.includes('observation-tower') &&
        value.unlockedNodeIds.includes('sunken-waterway') &&
        value.battle === null
      )
    case 'branch-choice':
      return (
        value.currentNodeId === 'graymoss-shallows' &&
        value.firstRecruitmentCompleted === true &&
        value.unlockedNodeIds.includes('observation-tower') &&
        value.unlockedNodeIds.includes('sunken-waterway') &&
        value.battle === null
      )
    case 'branch-selected':
      return (
        value.firstRecruitmentCompleted === true &&
        value.selectedBranchId !== null &&
        value.currentNodeId === value.selectedBranchId &&
        value.unlockedNodeIds.includes(value.selectedBranchId) &&
        value.battle === null
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
  if (!isRecord(value.settings)) return false
  if (typeof value.settings.soundEnabled !== 'boolean') return false
  if (typeof value.settings.reduceMotion !== 'boolean') return false
  return true
}
