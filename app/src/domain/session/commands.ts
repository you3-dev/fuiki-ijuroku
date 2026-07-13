import type { GameCommand, GameSessionState } from './types'

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
  }
}
