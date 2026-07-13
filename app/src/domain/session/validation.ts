import { GAME_SCHEMA_VERSION, type GameSessionState } from './types'

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
  if (!isRecord(value.settings)) return false
  if (typeof value.settings.soundEnabled !== 'boolean') return false
  if (typeof value.settings.reduceMotion !== 'boolean') return false
  return true
}
