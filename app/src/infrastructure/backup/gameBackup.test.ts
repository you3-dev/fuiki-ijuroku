import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../domain/session/createInitialState'
import { parseGameBackup, serializeGameBackup } from './gameBackup'

describe('game backup', () => {
  it('round-trips a valid game session', () => {
    const state = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const text = serializeGameBackup(state, new Date('2026-07-13T01:00:00.000Z'))

    expect(parseGameBackup(text)).toEqual(state)
  })

  it('migrates a schema version 1 backup by adding a fresh expedition state', () => {
    const { expedition: _expedition, ...currentState } = createInitialGameState(
      new Date('2026-07-13T00:00:00.000Z'),
    )
    const legacyState = { ...currentState, schemaVersion: 1 }
    const text = JSON.stringify({
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 1,
      exportedAt: '2026-07-13T01:00:00.000Z',
      state: legacyState,
    })

    const migrated = parseGameBackup(text)

    expect(migrated.schemaVersion).toBe(7)
    expect(migrated.expedition).toMatchObject({
      phase: 'idle',
      currentNodeId: null,
      firstRecruitmentCompleted: false,
    })
  })

  it('migrates a schema version 2 backup without losing first-expedition progress', () => {
    const current = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const {
      towerBattle: _towerBattle,
      towerCompleted: _towerCompleted,
      ...legacyExpedition
    } = current.expedition
    const legacyState = {
      ...current,
      schemaVersion: 2,
      expedition: legacyExpedition,
    }
    const text = JSON.stringify({
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 2,
      exportedAt: '2026-07-13T01:00:00.000Z',
      state: legacyState,
    })

    const migrated = parseGameBackup(text)

    expect(migrated.schemaVersion).toBe(7)
    expect(migrated.expedition).toMatchObject({
      phase: 'idle',
      towerBattle: null,
      towerCompleted: false,
    })
  })

  it('migrates a schema version 3 backup by adding waterway progress', () => {
    const current = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const {
      waterwayApproach: _waterwayApproach,
      waterwayBattle: _waterwayBattle,
      waterwayCompleted: _waterwayCompleted,
      ...legacyExpedition
    } = current.expedition
    const legacyState = { ...current, schemaVersion: 3, expedition: legacyExpedition }
    const text = JSON.stringify({
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 3,
      exportedAt: '2026-07-13T01:00:00.000Z',
      state: legacyState,
    })

    expect(parseGameBackup(text).expedition).toMatchObject({
      waterwayApproach: null,
      waterwayBattle: null,
      waterwayCompleted: false,
    })
  })

  it('migrates a schema version 4 backup by adding filter-grove progress', () => {
    const current = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const {
      groveEncounter: _groveEncounter,
      groveCompleted: _groveCompleted,
      relicCatalystObtained: _relicCatalystObtained,
      ...legacyExpedition
    } = current.expedition
    const legacyState = { ...current, schemaVersion: 4, expedition: legacyExpedition }
    const text = JSON.stringify({
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 4,
      exportedAt: '2026-07-13T01:00:00.000Z',
      state: legacyState,
    })

    expect(parseGameBackup(text).expedition).toMatchObject({
      groveEncounter: null,
      groveCompleted: false,
      relicCatalystObtained: false,
    })
  })

  it('migrates a schema version 5 backup by adding core-boss progress', () => {
    const current = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const {
      coreBossBattle: _coreBossBattle,
      bossReportChoice: _bossReportChoice,
      regionCompleted: _regionCompleted,
      ...legacyExpedition
    } = current.expedition
    const legacyState = { ...current, schemaVersion: 5, expedition: legacyExpedition }
    const text = JSON.stringify({
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 5,
      exportedAt: '2026-07-13T01:00:00.000Z',
      state: legacyState,
    })

    expect(parseGameBackup(text).expedition).toMatchObject({
      coreBossBattle: null,
      bossReportChoice: null,
      regionCompleted: false,
    })
  })

  it('migrates a schema version 6 backup without replaying completed onboarding', () => {
    const current = createInitialGameState(new Date('2026-07-13T00:00:00.000Z'))
    const {
      introBattleCompleted: _introBattleCompleted,
      ...legacyExpedition
    } = current.expedition
    const legacyState = {
      ...current,
      schemaVersion: 6,
      expedition: {
        ...legacyExpedition,
        phase: 'node-choice',
        currentNodeId: 'marsh-entrance',
        entryObserved: true,
        unlockedNodeIds: ['marsh-entrance', 'graymoss-shallows'],
      },
    }
    const text = JSON.stringify({
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 6,
      exportedAt: '2026-07-13T01:00:00.000Z',
      state: legacyState,
    })

    const migrated = parseGameBackup(text)
    expect(migrated.schemaVersion).toBe(7)
    expect(migrated.expedition).toMatchObject({
      phase: 'node-choice',
      introBattleCompleted: true,
    })
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
      schemaVersion: 7,
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
      schemaVersion: 7,
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

  it('rejects a backup whose outer and inner schema versions disagree', () => {
    const state = createInitialGameState()
    const malformed = {
      format: 'fuiki-ijuroku-save',
      backupVersion: 1,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      state,
    }

    expect(() => parseGameBackup(JSON.stringify(malformed))).toThrow(
      'バックアップの版情報が一致しません。',
    )
  })
})
