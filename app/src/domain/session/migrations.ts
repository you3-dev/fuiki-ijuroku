import { createInitialExpeditionState } from '../exploration/createInitialExpedition'
import { GAME_SCHEMA_VERSION, type GameSessionState } from './types'
import { isGameSessionState } from './validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function migrateGameSessionState(value: unknown): GameSessionState | null {
  if (isGameSessionState(value)) return value
  if (!isRecord(value) || value.schemaVersion !== 1) return null

  const migrated: unknown = {
    ...value,
    schemaVersion: GAME_SCHEMA_VERSION,
    expedition: createInitialExpeditionState(),
  }
  return isGameSessionState(migrated) ? migrated : null
}
