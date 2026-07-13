import { createContext, useContext } from 'react'
import type {
  GameCommand,
  GameSessionState,
  SaveStatus,
} from '../domain/session/types'

export type GameSessionContextValue = {
  state: GameSessionState | null
  saveStatus: SaveStatus
  bootError: string | null
  execute: (command: GameCommand) => Promise<void>
  restore: (state: GameSessionState) => Promise<void>
  retrySave: () => Promise<void>
  retryLoad: () => Promise<void>
  resetSession: () => Promise<void>
}

export const GameSessionContext = createContext<GameSessionContextValue | null>(null)

export function useGameSession(): GameSessionContextValue {
  const context = useContext(GameSessionContext)
  if (!context) {
    throw new Error('GameSessionProviderの内側で使用してください。')
  }
  return context
}
