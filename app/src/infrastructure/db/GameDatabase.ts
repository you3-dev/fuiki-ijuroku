import Dexie, { type Table } from 'dexie'
import type { GameSessionState } from '../../domain/session/types'
import { isGameSessionState } from '../../domain/session/validation'

type SessionRecord = {
  id: 'active'
  schemaVersion: number
  revision: number
  savedAt: string
  state: GameSessionState
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
    if (!isGameSessionState(record.state)) {
      throw new Error('保存データの形式を確認できませんでした。')
    }
    return record.state
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
