import type { GameSessionState } from '../../domain/session/types'
import type { GameDatabase } from './GameDatabase'

export class SaveCoordinator {
  private queue: Promise<void> = Promise.resolve()
  private readonly database: GameDatabase

  constructor(database: GameDatabase) {
    this.database = database
  }

  enqueue(state: GameSessionState): Promise<void> {
    const operation = this.queue.then(() => this.database.saveSession(state))
    this.queue = operation.catch(() => undefined)
    return operation
  }

  replace(state: GameSessionState): Promise<void> {
    const operation = this.queue.then(() => this.database.replaceSession(state))
    this.queue = operation.catch(() => undefined)
    return operation
  }
}
