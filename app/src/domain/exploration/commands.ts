import {
  createGroveEncounterState,
  createIntroBattleState,
  createSumiPracticeBattleState,
  createTutorialBattleState,
} from './createInitialExpedition'
import {
  resolveIntroBattleRound,
  setIntroBattlePlan,
} from './introBattle'
import {
  resolveSumiPracticeRound,
  setSumiPracticePlan,
} from './sumiPracticeBattle'
import { createTowerBattleState, updateTowerBattle } from '../battle/towerBattle'
import { createWaterwayBattleState, updateWaterwayBattle } from '../battle/waterwayBattle'
import { createCoreBossBattleState, updateCoreBossBattle } from '../battle/coreBossBattle'
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

export function canRequestGroveCooperation(
  encounter: ExpeditionState['groveEncounter'],
): boolean {
  return Boolean(
    encounter?.waveObserved &&
    encounter.emitterStopped &&
    encounter.stableFragmentOffered &&
    encounter.shellIntact &&
    encounter.vigilance <= 20,
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
        if (expedition.towerCompleted && expedition.waterwayCompleted) {
          if (expedition.groveCompleted) {
            return {
              expedition: {
                ...expedition,
                phase: expedition.regionCompleted ? 'region-complete' : 'core-preview',
                currentNodeId: 'purification-core',
                selectedBranchId: null,
                unlockedNodeIds: unlock(expedition, ['purification-core']),
              },
              recruitedSumiwatari: false,
            }
          }
          return {
            expedition: {
              ...expedition,
              phase: 'grove-event',
              currentNodeId: 'filter-grove',
              selectedBranchId: null,
              unlockedNodeIds: unlock(expedition, ['filter-grove']),
              groveEncounter: null,
            },
            recruitedSumiwatari: false,
          }
        }
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
          phase: expedition.introBattleCompleted ? 'node-choice' : 'intro-battle',
          entryObserved: true,
          battle: expedition.introBattleCompleted
            ? null
            : createIntroBattleState(),
          unlockedNodeIds: expedition.introBattleCompleted
            ? unlock(expedition, ['graymoss-shallows'])
            : expedition.unlockedNodeIds,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'setIntroBattlePlan': {
      if (
        expedition.phase !== 'intro-battle' ||
        !expedition.battle ||
        !('kind' in expedition.battle) ||
        expedition.battle.kind !== 'intro-normal'
      ) {
        return unchanged(expedition)
      }
      const battle = setIntroBattlePlan(
        expedition.battle,
        action.actorId,
        action.plan,
      )
      if (battle === expedition.battle) return unchanged(expedition)
      return {
        expedition: { ...expedition, battle },
        recruitedSumiwatari: false,
      }
    }
    case 'resolveIntroBattleRound': {
      if (
        expedition.phase !== 'intro-battle' ||
        !expedition.battle ||
        !('kind' in expedition.battle) ||
        expedition.battle.kind !== 'intro-normal'
      ) {
        return unchanged(expedition)
      }
      const battle = resolveIntroBattleRound(expedition.battle)
      if (battle === expedition.battle) return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: battle.outcome === 'victory' ? 'intro-result' : 'intro-battle',
          introBattleCompleted:
            expedition.introBattleCompleted || battle.outcome === 'victory',
          battle,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'finishIntroBattle': {
      if (
        expedition.phase !== 'intro-result' ||
        !expedition.battle ||
        !('kind' in expedition.battle) ||
        expedition.battle.kind !== 'intro-normal' ||
        expedition.battle.outcome !== 'victory'
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'node-choice',
          introBattleCompleted: true,
          battle: null,
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
      if (expedition.phase !== 'battle' || !battle || 'kind' in battle) {
        return unchanged(expedition)
      }
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
        expedition: expedition.sumiPracticeCompleted
          ? { ...expedition, phase: 'branch-choice' }
          : {
              ...expedition,
              phase: 'sumi-practice',
              battle: createSumiPracticeBattleState(),
            },
        recruitedSumiwatari: false,
      }
    }
    case 'setSumiPracticePlan': {
      if (
        expedition.phase !== 'sumi-practice' ||
        !expedition.battle ||
        !('kind' in expedition.battle) ||
        expedition.battle.kind !== 'sumi-practice'
      ) {
        return unchanged(expedition)
      }
      const battle = setSumiPracticePlan(
        expedition.battle,
        action.actorId,
        action.plan,
      )
      if (battle === expedition.battle) return unchanged(expedition)
      return {
        expedition: { ...expedition, battle },
        recruitedSumiwatari: false,
      }
    }
    case 'resolveSumiPracticeRound': {
      if (
        expedition.phase !== 'sumi-practice' ||
        !expedition.battle ||
        !('kind' in expedition.battle) ||
        expedition.battle.kind !== 'sumi-practice'
      ) {
        return unchanged(expedition)
      }
      const battle = resolveSumiPracticeRound(expedition.battle)
      if (battle === expedition.battle) return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: battle.outcome === 'victory'
            ? 'sumi-practice-result'
            : 'sumi-practice',
          sumiPracticeCompleted:
            expedition.sumiPracticeCompleted || battle.outcome === 'victory',
          battle,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'finishSumiPractice': {
      if (
        expedition.phase !== 'sumi-practice-result' ||
        !expedition.battle ||
        !('kind' in expedition.battle) ||
        expedition.battle.kind !== 'sumi-practice' ||
        expedition.battle.outcome !== 'victory'
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'branch-choice',
          sumiPracticeCompleted: true,
          battle: null,
        },
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
    case 'beginGroveEncounter': {
      if (
        expedition.phase !== 'grove-event' ||
        expedition.currentNodeId !== 'filter-grove' ||
        !expedition.towerCompleted ||
        !expedition.waterwayCompleted ||
        expedition.groveCompleted
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'grove-encounter',
          groveEncounter: createGroveEncounterState(),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'groveAction': {
      const encounter = expedition.groveEncounter
      if (expedition.phase !== 'grove-encounter' || !encounter) {
        return unchanged(expedition)
      }
      if (!encounter.shellIntact && action.action !== 'requestCooperation') {
        return unchanged(expedition)
      }
      switch (action.action) {
        case 'observeWave':
          if (encounter.waveObserved) return unchanged(expedition)
          return {
            expedition: {
              ...expedition,
              groveEncounter: {
                ...encounter,
                round: 2,
                waveObserved: true,
                lastAction: 'wave-observed',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'stopEmitter':
          if (!encounter.waveObserved || encounter.emitterStopped) {
            return unchanged(expedition)
          }
          return {
            expedition: {
              ...expedition,
              groveEncounter: {
                ...encounter,
                round: 3,
                vigilance: 30,
                emitterStopped: true,
                lastAction: 'emitter-stopped',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'offerStableFragment':
          if (!encounter.emitterStopped || encounter.stableFragmentOffered) {
            return unchanged(expedition)
          }
          return {
            expedition: {
              ...expedition,
              groveEncounter: {
                ...encounter,
                round: 4,
                vigilance: 20,
                stableFragmentOffered: true,
                lastAction: 'fragment-offered',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'damageShell':
          if (!encounter.shellIntact) return unchanged(expedition)
          return {
            expedition: {
              ...expedition,
              groveEncounter: {
                ...encounter,
                shellIntact: false,
                lastAction: 'shell-damaged',
              },
            },
            recruitedSumiwatari: false,
          }
        case 'requestCooperation':
          if (!canRequestGroveCooperation(encounter)) return unchanged(expedition)
          return {
            expedition: { ...expedition, phase: 'grove-result' },
            recruitedSumiwatari: false,
            recruitedRekimatoi: true,
          }
      }
    }
    case 'retryGroveEncounter': {
      if (
        expedition.phase !== 'grove-encounter' ||
        !expedition.groveEncounter ||
        expedition.groveEncounter.shellIntact
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          groveEncounter: createGroveEncounterState(),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'completeGroveSurvey': {
      if (expedition.phase !== 'grove-result') return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: 'grove-complete',
          groveEncounter: null,
          groveCompleted: true,
          relicCatalystObtained: true,
          unlockedNodeIds: unlock(expedition, ['purification-core']),
        },
        recruitedSumiwatari: false,
        completedGrove: true,
      }
    }
    case 'beginCoreBattle': {
      if (
        expedition.phase !== 'core-preview' ||
        expedition.currentNodeId !== 'purification-core' ||
        !expedition.groveCompleted ||
        expedition.regionCompleted
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'core-battle',
          coreBossBattle: createCoreBossBattleState(),
          bossReportChoice: null,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'coreBossCommand': {
      if (expedition.phase !== 'core-battle' || !expedition.coreBossBattle) {
        return unchanged(expedition)
      }
      const coreBossBattle = updateCoreBossBattle(
        expedition.coreBossBattle,
        action.command,
      )
      if (coreBossBattle === expedition.coreBossBattle) return unchanged(expedition)
      return {
        expedition: {
          ...expedition,
          phase: coreBossBattle.outcome === 'secured'
            ? 'core-result'
            : expedition.phase,
          coreBossBattle,
        },
        recruitedSumiwatari: false,
      }
    }
    case 'retryCoreBoss': {
      if (
        expedition.phase !== 'core-battle' ||
        !expedition.coreBossBattle ||
        !['ecosystem-damaged', 'party-defeated'].includes(
          expedition.coreBossBattle.outcome,
        )
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          coreBossBattle: createCoreBossBattleState(),
        },
        recruitedSumiwatari: false,
      }
    }
    case 'selectBossReport': {
      if (
        expedition.phase !== 'core-result' ||
        !expedition.coreBossBattle ||
        expedition.coreBossBattle.outcome !== 'secured' ||
        expedition.bossReportChoice === action.choice
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: { ...expedition, bossReportChoice: action.choice },
        recruitedSumiwatari: false,
      }
    }
    case 'completeRegionReport': {
      if (
        expedition.phase !== 'core-result' ||
        !expedition.coreBossBattle ||
        expedition.coreBossBattle.outcome !== 'secured' ||
        !expedition.bossReportChoice
      ) {
        return unchanged(expedition)
      }
      return {
        expedition: {
          ...expedition,
          phase: 'region-complete',
          coreBossBattle: null,
          regionCompleted: true,
        },
        recruitedSumiwatari: false,
        completedRegion: true,
      }
    }
    case 'returnToLaboratory': {
      if (
        expedition.phase === 'battle' ||
        expedition.phase === 'intro-battle' ||
        expedition.phase === 'intro-result' ||
        expedition.phase === 'sumi-practice' ||
        expedition.phase === 'sumi-practice-result' ||
        expedition.phase === 'tower-battle' ||
        expedition.phase === 'tower-result' ||
        expedition.phase === 'waterway-battle' ||
        expedition.phase === 'waterway-result' ||
        expedition.phase === 'grove-encounter' ||
        expedition.phase === 'grove-result' ||
        expedition.phase === 'core-battle' ||
        expedition.phase === 'core-result' ||
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
          groveEncounter: null,
          coreBossBattle: null,
        },
        recruitedSumiwatari: false,
      }
    }
  }
}
