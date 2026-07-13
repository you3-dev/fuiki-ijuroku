import type {
  AllyCombatantId,
  BattleSkillId,
  CombatantId,
  EnemyCombatantId,
} from './types'

export type CombatantDefinition = {
  id: CombatantId
  name: string
  maxHp: number
  attack: number
  defense: number
  sense: number
  resistance: number
  agility: number
  basicName: string
  basicPower: number
  basicType: 'physical' | 'ecological'
}
export const combatants: Record<CombatantId, CombatantDefinition> = {
  tomoshigoke: {
    id: 'tomoshigoke',
    name: 'トモシゴケ',
    maxHp: 72,
    attack: 18,
    defense: 18,
    sense: 42,
    resistance: 30,
    agility: 44,
    basicName: '灯角突き',
    basicPower: 14,
    basicType: 'physical',
  },
  numakuguri: {
    id: 'numakuguri',
    name: 'ヌマクグリ',
    maxHp: 108,
    attack: 30,
    defense: 42,
    sense: 18,
    resistance: 32,
    agility: 22,
    basicName: '大尾打ち',
    basicPower: 16,
    basicType: 'physical',
  },
  sumiwatari: {
    id: 'sumiwatari',
    name: 'スミワタリ',
    maxHp: 80,
    attack: 16,
    defense: 24,
    sense: 40,
    resistance: 42,
    agility: 36,
    basicName: '水圧弾',
    basicPower: 14,
    basicType: 'ecological',
  },
  kirihane: {
    id: 'kirihane',
    name: 'キリハネ',
    maxHp: 68,
    attack: 24,
    defense: 18,
    sense: 38,
    resistance: 30,
    agility: 58,
    basicName: '翅刃',
    basicPower: 15,
    basicType: 'ecological',
  },
}

export const allyIds: AllyCombatantId[] = [
  'tomoshigoke',
  'numakuguri',
  'sumiwatari',
]

export const enemyIds: EnemyCombatantId[] = ['kirihane']

export const skillDefinitions: Record<
  BattleSkillId,
  { name: string; vitalityCost: number; actorId: AllyCombatantId }
> = {
  'calming-glimmer': {
    name: '静かな明滅',
    vitalityCost: 20,
    actorId: 'tomoshigoke',
  },
  'burrow-guard': {
    name: '身代わり潜行',
    vitalityCost: 20,
    actorId: 'numakuguri',
  },
  'clarifying-flow': {
    name: '澄み流し',
    vitalityCost: 25,
    actorId: 'sumiwatari',
  },
}
