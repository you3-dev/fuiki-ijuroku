import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../domain/session/createInitialState'
import { parseGameBackup, serializeGameBackup } from './gameBackup'

describe('game backup', () => {
  it('round-trips a valid game session', () => {
    const state = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const text = serializeGameBackup(state, new Date('2026-07-13T01:00:00.000Z'))

    expect(parseGameBackup(text)).toEqual(state)
  })

  it('rejects malformed JSON without changing the current save', () => {
    expect(() => parseGameBackup('{broken')).toThrow('JSONファイルを読み取れませんでした。')
  })

  it('rejects an unknown backup format', () => {
    expect(() =>
      parseGameBackup(
        JSON.stringify({ format: 'another-game', backupVersion: 1, state: {} }),
      ),
    ).toThrow('対応していないバックアップ形式です。')
  })

  it('rejects malformed party members that would crash the UI', () => {
    const state = createInitialGameState()
    const malformed = {
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      state: {
        ...state,
        party: { ...state.party, front: [1, 2, 3] },
      },
    }

    expect(() => parseGameBackup(JSON.stringify(malformed))).toThrow(
      'セーブ内容の検証に失敗しました。',
    )
  })

  it('rejects progress values outside their declared totals', () => {
    const state = createInitialGameState()
    const malformed = {
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      state: {
        ...state,
        objective: { ...state.objective, recordsFound: 4 },
      },
    }

    expect(() => parseGameBackup(JSON.stringify(malformed))).toThrow(
      'セーブ内容の検証に失敗しました。',
    )
  })
})
