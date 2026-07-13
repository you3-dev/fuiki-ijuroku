import { createTutorialBattleState } from './createInitialExpedition'
import { createTowerBattleState, updateTowerBattle } from '../battle/towerBattle'
import { createWaterwayBattleState, updateWaterwayBattle } from '../battle/waterwayBattle'
import type {
  ExpeditionState,
  ExplorationAction,
  ExplorationTransition,
  RegionNodeId,
  TutorialBattleState,
} from './types'

const BRANCH_NODE_IDS: RegionNodeId[] = ['observation-tower', 'sunken-waterway']

function unchanged(expedition: ExpeditionState): ExplorationTransition {
  return { expedition, recruitedSumiwatari: false }
}

function unlock(expedition: ExpeditionState, nodeIds: RegionNodeId[]): RegionNodeId[] {
  return Array.from(new Set([...expedition.unlockedNodeIds, ...nodeIds]))
}

export function canRequestCooperation(battle: TutorialBattleState): boolean {
  return (
    battle.observed &&
    battle.pressureDefended &&
    !battle.polluted &&
    battle.vigilance <= 20 &&
    battle.calmed
  )
}

export function advanceExpedition(
  expedition: ExpeditionState,
  action: ExplorationAction,
): ExplorationTransition {
  switch (action.type) {
    case 'startExpedition': {
      if (expedition.phase !== 'idle') return unchanged(expedition)
      if (expedition.firstRecruitmentCompleted) {
        return {
          expedition: {
            ...expedition,
            phase: 'branch-choice',
            currentNodeId: 'graymoss-shallows',
            unlockedNodeIds: unlock(expedition, BRANCH_NODE_IDS),
          },
          recruitedSumiwatari: false,
        }
      }
      return {
        expedition: {
          ...expedition,
          phase: 'entrance',
          currentNodeId: 'marsh-entrance',
          battle: null,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'observeEntrance': {
      if (expedition.phase !== 'entrance') return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: 'node-choice',
          entryObserved: true,
          unlockedNodeIds: unlock(expedition, ['graymoss-shallows']),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'enterNode': {
      if (!expedition.unlockedNodeIds.includes(action.nodeId)) {
        return unchanged(expedition)
      }
      if (expedition.phase === 'node-choice' && action.nodeId === 'graymoss-shallows') {
        return {
          expedition: {
            ...expedition,
            phase: 'battle',
            currentNodeId: action.nodeId,
            battle: createTutorialBattleState(),
          },
          recruitedSumiwatari: false,
        }
      }
      if (
        expedition.phase === 'branch-choice' &&
        (action.nodeId === 'observation-tower' || action.nodeId === 'sunken-waterway')
      ) {
        const isTower = action.nodeId === 'observation-tower'
        return {
          expedition: {
            ...expedition,
            phase: isTower
              ? expedition.towerCompleted ? 'tower-complete' : 'tower-event'
              : expedition.waterwayCompleted ? 'waterway-complete' : 'waterway-event',
            currentNodeId: action.nodeId,
            selectedBranchId: action.nodeId,
            towerBattle: null,
            waterwayApproach: isTower || expedition.waterwayCompleted
              ? expedition.waterwayApproach
              : null,
            waterwayBattle: null,
          },
          recruitedSumiwatari: false,
        }
      }
      return unchanged(expedition)
    }
    case 'battleAction': {
      const battle = expedition.battle
      if (expedition.phase !== 'battle' || !battle) return unchanged(expedition)
      switch (action.action) {
        case 'observe':
          if (battle.observed) return unchanged(expedition)
          return {
            expedition: {
              ...expedition,
              battle: { ...battle, round: 2, observed: true, lastAction: 'observed' },
            },
            recruitedSumiwatari: false,
          }
        case 'defend':
          if (!battle.observed || battle.pressureDefended) return unchanged(expedition)
          return {
            expedition: {
              ...expedition,
              battle: {
                ...battle,
                round: 3,
                pressureDefended: true,
                lastAction: 'defended',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'cleanse':
          if (!battle.pressureDefended || !battle.polluted || battle.cleanserCount < 1) {
            return unchanged(expedition)
          }
          return {
            expedition: {
              ...expedition,
              battle: {
                ...battle,
                round: 4,
                vigilance: Math.max(0, battle.vigilance - 20),
                polluted: false,
                cleanserCount: battle.cleanserCount - 1,
                lastAction: 'cleansed',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'calm':
          if (battle.polluted || battle.calmed) return unchanged(expedition)
          return {
            expedition: {
              ...expedition,
              battle: {
                ...battle,
                round: 5,
                vigilance: Math.max(0, battle.vigilance - 20),
                calmed: true,
                lastAction: 'calmed',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'requestCooperation':
          if (!canRequestCooperation(battle)) return unchanged(expedition)
          return {
            expedition: {
              ...expedition,
              phase: 'recruit-result',
              firstRecruitmentCompleted: true,
              unlockedNodeIds: unlock(expedition, BRANCH_NODE_IDS),
              battle: null,
            },
            recruitedSumiwatari: true,
          }
      }
    }
    case 'finishRecruitment': {
      if (expedition.phase !== 'recruit-result') return unchanged(expedition)
      return {
        expedition: { ...expedition, phase: 'branch-choice' },
        recruitedSumiwatari: false,
      }
    }
    case 'beginTowerEncounter': {
      if (
        expedition.phase !== 'tower-event' ||
        expedition.currentNodeId !== 'observation-tower'
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'tower-battle',
          towerBattle: createTowerBattleState(),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'towerBattleCommand': {
      if (expedition.phase !== 'tower-battle' || !expedition.towerBattle) {
        return unchanged(expedition)
      }
      const towerBattle = updateTowerBattle(
        expedition.towerBattle,
        action.command,
      )
      if (towerBattle === expedition.towerBattle) return unchanged(expedition)
      if (towerBattle.outcome === 'cooperation') {
        return {
          expedition: {
            ...expedition,
            phase: 'tower-result',
            towerBattle,
          },
          recruitedSumiwatari: false,
          recruitedKirihane: true,
        }
      }
      return {
        expedition: { ...expedition, towerBattle },
        recruitedSumiwatari: false,
      }
    }
    case 'retryTowerEncounter': {
      if (
        expedition.phase !== 'tower-battle' ||
        !expedition.towerBattle ||
        !['enemy-defeated', 'party-defeated'].includes(
          expedition.towerBattle.outcome,
        )
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: { ...expedition, towerBattle: createTowerBattleState() },
        recruitedSumiwatari: false,
      }
    }
    case 'alignTowerReflector': {
      if (expedition.phase !== 'tower-result') return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: 'tower-complete',
          towerBattle: null,
          towerCompleted: true,
        },
        recruitedSumiwatari: false,
        completedTower: true,
      }
    }
    case 'selectWaterwayApproach': {
      if (
        expedition.phase !== 'waterway-event' ||
        expedition.currentNodeId !== 'sunken-waterway'
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'waterway-battle',
          waterwayApproach: action.approach,
          waterwayBattle: createWaterwayBattleState(action.approach),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'waterwayBattleCommand': {
      if (expedition.phase !== 'waterway-battle' || !expedition.waterwayBattle) {
        return unchanged(expedition)
      }
      const waterwayBattle = updateWaterwayBattle(
        expedition.waterwayBattle,
        action.command,
      )
      if (waterwayBattle === expedition.waterwayBattle) return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: waterwayBattle.outcome === 'secured'
            ? 'waterway-result'
            : expedition.phase,
          waterwayBattle,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'retryWaterwayEncounter': {
      if (
        expedition.phase !== 'waterway-battle' ||
        !expedition.waterwayBattle ||
        !expedition.waterwayApproach ||
        !['ecosystem-damaged', 'party-defeated'].includes(
          expedition.waterwayBattle.outcome,
        )
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          waterwayBattle: createWaterwayBattleState(expedition.waterwayApproach),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'flushWaterwayValve': {
      if (expedition.phase !== 'waterway-result') return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: 'waterway-complete',
          waterwayBattle: null,
          waterwayCompleted: true,
        },
        recruitedSumiwatari: false,
        completedWaterway: true,
      }
    }
    case 'returnToLaboratory': {
      if (
        expedition.phase === 'battle' ||
        expedition.phase === 'tower-battle' ||
        expedition.phase === 'tower-result' ||
        expedition.phase === 'waterway-battle' ||
        expedition.phase === 'waterway-result' ||
        expedition.phase === 'idle'
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'idle',
          currentNodeId: null,
          battle: null,
          towerBattle: null,
          waterwayBattle: null,
        },
        recruitedSumiwatari: false,
      }
    }
  }
}
