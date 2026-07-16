import { GAME_SCHEMA_VERSION, type GameSessionState } from '../../domain/session/types'
import { migrateGameSessionState } from '../../domain/session/migrations'

const BACKUP_FORMAT = 'fuiki-ijuroku-save'
const BACKUP_VERSION = 1

type GameBackup = {
  format: typeof BACKUP_FORMAT
  backupVersion: typeof BACKUP_VERSION
  schemaVersion: typeof GAME_SCHEMA_VERSION
  exportedAt: string
  state: GameSessionState
}

export function serializeGameBackup(
  state: GameSessionState,
  now = new Date(),
): string {
  const backup: GameBackup = {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    schemaVersion: GAME_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    state,
  }
  return JSON.stringify(backup, null, 2)
}

export function parseGameBackup(text: string): GameSessionState {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('JSONファイルを読み取れませんでした。')
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('バックアップの形式が正しくありません。')
  }

  const backup = value as Record<string, unknown>
  if (backup.format !== BACKUP_FORMAT || backup.backupVersion !== BACKUP_VERSION) {
    throw new Error('対応していないバックアップ形式です。')
  }
  const rawState = backup.state
  const rawStateVersion =
    typeof rawState === 'object' && rawState !== null && !Array.isArray(rawState)
      ? (rawState as Record<string, unknown>).schemaVersion
      : undefined
  if (
    (![1, 2, 3, 4, 5, 6, GAME_SCHEMA_VERSION].includes(Number(backup.schemaVersion))) ||
    backup.schemaVersion !== rawStateVersion
  ) {
    throw new Error('バックアップの版情報が一致しません。')
  }
  const state = migrateGameSessionState(rawState)
  if (!state) {
    throw new Error('セーブ内容の検証に失敗しました。')
  }
  return state
}

export function downloadGameBackup(state: GameSessionState): void {
  const blob = new Blob([serializeGameBackup(state)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `fuiki-ijuroku-save-${date}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
