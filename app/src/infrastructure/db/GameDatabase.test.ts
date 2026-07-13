import { afterEach, describe, expect, it } from 'vitest'
import { createInitialGameState } from '../../domain/session/createInitialState'
import { executeGameCommand } from '../../domain/session/commands'
import { GameDatabase } from './GameDatabase'
import { SaveCoordinator } from './SaveCoordinator'

const databases: GameDatabase[] = []

function createDatabase(): GameDatabase {
  const database = new GameDatabase(`fuiki-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

describe('GameDatabase', () => {
  it('persists and reloads a valid session', async () => {
    const database = createDatabase()
    const state = createInitialGameState()
    await database.saveSession(state)

    expect(await database.loadSession()).toEqual(state)
  })

  it('does not allow an older revision to overwrite a newer revision', async () => {
    const database = createDatabase()
    const initial = createInitialGameState()
    const newer = executeGameCommand(initial, { type: 'recordPreparation' })

    await database.saveSession(newer)
    await database.saveSession(initial)

    expect((await database.loadSession())?.revision).toBe(newer.revision)
  })

  it('serializes rapid save requests through the coordinator', async () => {
    const database = createDatabase()
    const coordinator = new SaveCoordinator(database)
    const initial = createInitialGameState()
    const revision2 = executeGameCommand(initial, { type: 'recordPreparation' })
    const revision3 = executeGameCommand(revision2, {
      type: 'renamePlayer',
      name: '湿原調査員',
    })

    await Promise.all([
      coordinator.enqueue(initial),
      coordinator.enqueue(revision2),
      coordinator.enqueue(revision3),
    ])

    expect(await database.loadSession()).toEqual(revision3)
  })
})
