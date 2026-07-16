import { createInitialExpeditionState } from '../exploration/createInitialExpedition'
import { GAME_SCHEMA_VERSION, type GameSessionState } from './types'
import { isGameSessionState } from './validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migrateLegacyBranchPhase(expedition: Record<string, unknown>): unknown {
  if (expedition.phase !== 'branch-selected') return expedition.phase
  if (expedition.currentNodeId === 'observation-tower') return 'tower-event'
  if (expedition.currentNodeId === 'sunken-waterway') return 'waterway-event'
  return expedition.phase
}

function addWaterwayState(expedition: Record<string, unknown>) {
  return {
    ...expedition,
    phase: migrateLegacyBranchPhase(expedition),
    waterwayApproach: null,
    waterwayBattle: null,
    waterwayCompleted: false,
  }
}

function addGroveState(expedition: Record<string, unknown>) {
  return {
    ...expedition,
    groveEncounter: null,
    groveCompleted: false,
    relicCatalystObtained: false,
  }
}

function addCoreState(expedition: Record<string, unknown>) {
  return {
    ...expedition,
    coreBossBattle: null,
    bossReportChoice: null,
    regionCompleted: false,
  }
}

function addIntroBattleState(expedition: Record<string, unknown>) {
  return {
    ...expedition,
    introBattleCompleted:
      expedition.entryObserved === true || expedition.firstRecruitmentCompleted === true,
  }
}

function addSumiPracticeState(expedition: Record<string, unknown>) {
  return {
    ...expedition,
    sumiPracticeCompleted: expedition.firstRecruitmentCompleted === true,
  }
}

export function migrateGameSessionState(value: unknown): GameSessionState | null {
  if (isGameSessionState(value)) return value
  if (!isRecord(value)) return null

  if (value.schemaVersion === 1) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: createInitialExpeditionState(),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  if (value.schemaVersion === 2 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: addSumiPracticeState(addIntroBattleState(addCoreState(addGroveState(addWaterwayState({
        ...value.expedition,
        phase:
          value.expedition.phase === 'branch-selected' &&
          value.expedition.currentNodeId === 'observation-tower'
            ? 'tower-event'
            : value.expedition.phase,
        towerBattle: null,
        towerCompleted: false,
      }))))),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  if (value.schemaVersion === 3 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: addSumiPracticeState(addIntroBattleState(addCoreState(addGroveState(addWaterwayState(value.expedition))))),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  if (value.schemaVersion === 4 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: addSumiPracticeState(addIntroBattleState(addCoreState(addGroveState(value.expedition)))),
    }
    return isGameSessionState(migrated) ? migrated : null
  }


  if (value.schemaVersion === 5 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: addSumiPracticeState(addIntroBattleState(addCoreState(value.expedition))),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  if (value.schemaVersion === 6 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: addSumiPracticeState(addIntroBattleState(value.expedition)),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  if (value.schemaVersion === 7 && isRecord(value.expedition)) {
    const migrated: unknown = {
      ...value,
      schemaVersion: GAME_SCHEMA_VERSION,
      expedition: addSumiPracticeState(value.expedition),
    }
    return isGameSessionState(migrated) ? migrated : null
  }

  return null
}
