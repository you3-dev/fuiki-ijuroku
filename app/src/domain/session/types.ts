import type { ExpeditionState, ExplorationAction } from '../exploration/types'

export const GAME_SCHEMA_VERSION = 8

export type CreatureSummary = {
  id: string
  speciesId: string
  displayName: string
  level: number
  role: string
  status: 'ready' | 'resting' | 'incapacitated'
}

export type ObjectiveState = {
  id: string
  regionId: string
  title: string
  summary: string
  recordsFound: number
  recordsTotal: number
  valvesRestored: number
  valvesTotal: number
  preparationRecorded: boolean
}

export type ResearchUpdate = {
  id: string
  title: string
  detail: string
  acknowledged: boolean
}

export type GameSettings = {
  soundEnabled: boolean
  reduceMotion: boolean
}

export type GameSessionState = {
  schemaVersion: typeof GAME_SCHEMA_VERSION
  revision: number
  profile: {
    id: 'primary'
    name: string
    createdAt: string
  }
  objective: ObjectiveState
  party: {
    front: Array<CreatureSummary | null>
    reserve: Array<CreatureSummary | null>
  }
  researchUpdates: ResearchUpdate[]
  expedition: ExpeditionState
  settings: GameSettings
}

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'retrying' | 'failed'

export type GameCommand =
  | { type: 'recordPreparation' }
  | { type: 'acknowledgeUpdate'; updateId: string }
  | { type: 'renamePlayer'; name: string }
  | { type: 'renameCreature'; creatureId: string; name: string }
  | { type: 'updateSettings'; patch: Partial<GameSettings> }
  | { type: 'exploration'; action: ExplorationAction }
