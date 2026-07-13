import Dexie, { type Table } from 'dexie'
import type { GameSessionState } from '../../domain/session/types'
import { migrateGameSessionState } from '../../domain/session/migrations'

type SessionRecord = {
  id: 'active'
  schemaVersion: number
  revision: number
  savedAt: string
  state: unknown
}

export class GameDatabase extends Dexie {
  sessions!: Table<SessionRecord, 'active'>

  constructor(name = 'fuiki-ijuroku') {
    super(name)
    this.version(1).stores({ sessions: 'id, revision, savedAt' })
  }

  async loadSession(): Promise<GameSessionState | null> {
    const record = await this.sessions.get('active')
    if (!record) return null
    const rawStateVersion =
      typeof record.state === 'object' && record.state !== null && !Array.isArray(record.state)
        ? (record.state as Record<string, unknown>).schemaVersion
        : undefined
    if (record.schemaVersion !== rawStateVersion) {
      throw new Error('保存データの版情報が一致しません。')
    }
    const rawRevision =
      typeof record.state === 'object' && record.state !== null && !Array.isArray(record.state)
        ? (record.state as Record<string, unknown>).revision
        : undefined
    if (record.revision !== rawRevision) {
      throw new Error('保存データのリビジョン情報が一致しません。')
    }
    const state = migrateGameSessionState(record.state)
    if (!state) {
      throw new Error('保存データの形式を確認できませんでした。')
    }
    if (rawStateVersion !== state.schemaVersion) {
      await this.replaceSession(state)
    }
    return state
  }

  async saveSession(state: GameSessionState): Promise<void> {
    await this.transaction('rw', this.sessions, async () => {
      const current = await this.sessions.get('active')
      if (current && current.revision > state.revision) return
      await this.sessions.put({
        id: 'active',
        schemaVersion: state.schemaVersion,
        revision: state.revision,
        savedAt: new Date().toISOString(),
        state,
      })
    })
  }

  async replaceSession(state: GameSessionState): Promise<void> {
    await this.sessions.put({
      id: 'active',
      schemaVersion: state.schemaVersion,
      revision: state.revision,
      savedAt: new Date().toISOString(),
      state,
    })
  }
}
