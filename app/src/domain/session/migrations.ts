import { createInitialExpeditionState } from '../exploration/createInitialExpedition'
import { GAME_SCHEMA_VERSION, type GameSessionState } from './types'
import { isGameSessionState } from './validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function migrateGameSessionState(value: unknown): GameSessionState | null {
  if (isGameSessionState(value)) return value
  if (!isRecord(value)) return null

  if (value.schemaVersion === 1) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: createInitialExpeditionState(),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  if (value.schemaVersion === 2 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: {
        ...value.expedition,
        phase:
          value.expedition.phase === 'branch-selected' &&
          value.expedition.currentNodeId === 'observation-tower'
            ? 'tower-event'
            : value.expedition.phase,
        towerBattle: null,
        towerCompleted: false,
      },
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  return null
}
