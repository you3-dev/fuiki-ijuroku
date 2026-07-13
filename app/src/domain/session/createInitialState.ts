import {
  GAME_SCHEMA_VERSION,
  type CreatureSummary,
  type GameSessionState,
} from './types'
import { createInitialExpeditionState } from '../exploration/createInitialExpedition'

const tomoshigoke: CreatureSummary = {
  id: 'creature-tomoshigoke-001',
  speciesId: 'tomoshigoke',
  displayName: 'トモシゴケ',
  level: 3,
  role: '回復・鎮静',
  status: 'ready',
}

const numakuguri: CreatureSummary = {
  id: 'creature-numakuguri-001',
  speciesId: 'numakuguri',
  displayName: 'ヌマクグリ',
  level: 3,
  role: '防御・かばう',
  status: 'ready',
}

export function createInitialGameState(now = new Date()): GameSessionState {
  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    revision: 1,
    profile: {
      id: 'primary',
      name: '新人調査員',
      createdAt: now.toISOString(),
    },
    objective: {
      id: 'objective-graymoss-entry',
      regionId: 'graymoss-marsh',
      title: '灰苔湿原',
      summary: '上下流弁の停止と、異獣の異常行動を確認する',
      recordsFound: 0,
      recordsTotal: 3,
      valvesRestored: 0,
      valvesTotal: 2,
      preparationRecorded: false,
    },
    party: {
      front: [tomoshigoke, numakuguri, null],
      reserve: [null, null, null],
    },
    researchUpdates: [
      {
        id: 'update-initial-assignment',
        title: '初回調査を登録',
        detail: '灰苔湿原の入口から、先遣隊の痕跡を追います。',
        acknowledged: false,
      },
      {
        id: 'update-party-issued',
        title: '初期同行個体を受領',
        detail: 'トモシゴケとヌマクグリの計測値は安定しています。',
        acknowledged: false,
      },
    ],
    expedition: createInitialExpeditionState(),
    settings: {
      soundEnabled: false,
      reduceMotion: false,
    },
  }
}
