import type { GameCommand, GameSessionState } from './types'
import { advanceExpedition } from '../exploration/commands'
import type { CreatureSummary, ResearchUpdate } from './types'

function nextRevision(state: GameSessionState): number {
  return state.revision + 1
}

function normalizeName(name: string): string {
  return Array.from(name)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint > 31 && codePoint !== 127
    })
    .join('')
    .trim()
    .slice(0, 20)
}

const sumiwatari: CreatureSummary = {
  id: 'creature-sumiwatari-tutorial-001',
  speciesId: 'sumiwatari',
  displayName: 'スミワタリ',
  level: 2,
  role: '浄化・状態解除',
  status: 'ready',
}

const SUMIWATARI_ID = sumiwatari.id

const recruitmentUpdate: ResearchUpdate = {
  id: 'update-sumiwatari-recruited',
  title: '浅瀬の協力個体を登録',
  detail: '観察と鎮静により、スミワタリが前衛へ加わりました。',
  acknowledged: false,
}

export function executeGameCommand(
  state: GameSessionState,
  command: GameCommand,
): GameSessionState {
  switch (command.type) {
    case 'recordPreparation': {
      if (state.objective.preparationRecorded) return state
      return {
        ...state,
        revision: nextRevision(state),
        objective: { ...state.objective, preparationRecorded: true },
      }
    }
    case 'acknowledgeUpdate': {
      const target = state.researchUpdates.find(
        (update) => update.id === command.updateId,
      )
      if (!target || target.acknowledged) return state
      return {
        ...state,
        revision: nextRevision(state),
        researchUpdates: state.researchUpdates.map((update) =>
          update.id === command.updateId
            ? { ...update, acknowledged: true }
            : update,
        ),
      }
    }
    case 'renamePlayer': {
      const name = normalizeName(command.name)
      if (!name || name === state.profile.name) return state
      return {
        ...state,
        revision: nextRevision(state),
        profile: { ...state.profile, name },
      }
    }
    case 'renameCreature': {
      const name = normalizeName(command.name)
      if (!name) return state
      let changed = false
      const rename = (creature: CreatureSummary | null) => {
        if (!creature || creature.id !== command.creatureId || creature.displayName === name) {
          return creature
        }
        changed = true
        return { ...creature, displayName: name }
      }
      const front = state.party.front.map(rename)
      const reserve = state.party.reserve.map(rename)
      if (!changed) return state
      return {
        ...state,
        revision: nextRevision(state),
        party: { front, reserve },
      }
    }
    case 'updateSettings': {
      const settings = { ...state.settings, ...command.patch }
      if (
        settings.soundEnabled === state.settings.soundEnabled &&
        settings.reduceMotion === state.settings.reduceMotion
      ) {
        return state
      }
      return {
        ...state,
        revision: nextRevision(state),
        settings,
      }
    }
    case 'exploration': {
      if (
        command.action.type === 'startExpedition' &&
        !state.expedition.firstRecruitmentCompleted
      ) {
        const activeFront = state.party.front.filter((creature) => creature !== null)
        if (
          !state.objective.preparationRecorded ||
          activeFront.length !== 2 ||
          state.party.front[2] !== null
        ) {
          return state
        }
      }

      if (
        command.action.type === 'battleAction' &&
        command.action.action === 'requestCooperation'
      ) {
        const alreadyInFront = state.party.front.some(
          (creature) => creature?.id === SUMIWATARI_ID,
        )
        if (!alreadyInFront && !state.party.front.includes(null)) return state
      }

      const transition = advanceExpedition(state.expedition, command.action)
      if (transition.expedition === state.expedition) return state

      let party = state.party
      let researchUpdates = state.researchUpdates
      if (transition.recruitedSumiwatari) {
        const frontIndex = party.front.findIndex(
          (creature) => creature?.id === SUMIWATARI_ID,
        )
        const reserveIndex = party.reserve.findIndex(
          (creature) => creature?.id === SUMIWATARI_ID,
        )
        const emptyFrontIndex = party.front.findIndex((creature) => creature === null)
        if (frontIndex < 0 && emptyFrontIndex >= 0) {
          const front = [...party.front]
          const reserve = [...party.reserve]
          front[emptyFrontIndex] = reserveIndex >= 0 ? reserve[reserveIndex] : sumiwatari
          if (reserveIndex >= 0) reserve[reserveIndex] = null
          party = { front, reserve }
        }
        if (!researchUpdates.some((update) => update.id === recruitmentUpdate.id)) {
          researchUpdates = [...researchUpdates, recruitmentUpdate]
        }
      }

      return {
        ...state,
        revision: nextRevision(state),
        expedition: transition.expedition,
        party,
        researchUpdates,
      }
    }
  }
}
