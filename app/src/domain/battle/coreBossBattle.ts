import { allyIds, combatants, skillDefinitions } from './data'
import type {
  AllyCombatantId,
  CoreBossBattleCommand,
  CoreBossBattleState,
  CoreBossPlanTargetId,
  CoreBossPlannedAction,
  CoreBossSupport,
  CoreBossTargetId,
} from './types'

export const coreBossTargetNames: Record<CoreBossTargetId, string> = {
  nigorigui: 'ニゴリグイ',
  'left-pollution-mass': '左側の汚染塊',
  'right-pollution-mass': '右側の汚染塊',
}

export const coreBossTargetMaxHp: Record<CoreBossTargetId, number> = {
  nigorigui: 180,
  'left-pollution-mass': 35,
  'right-pollution-mass': 35,
}

export const CORE_BOSS_OVERLOAD_LIMIT = 200

const pollutionMassIds = [
  'left-pollution-mass',
  'right-pollution-mass',
] as const satisfies readonly CoreBossTargetId[]

function defaultPlans(): Record<AllyCombatantId, CoreBossPlannedAction> {
  return {
    tomoshigoke: { kind: 'defend', targetId: 'tomoshigoke' },
    numakuguri: { kind: 'defend', targetId: 'numakuguri' },
    sumiwatari: { kind: 'defend', targetId: 'sumiwatari' },
  }
}

export function createCoreBossBattleState(): CoreBossBattleState {
  return {
    kind: 'purification-core',
    phase: 'planning',
    round: 1,
    randomSeed: 420784,
    stage: 1,
    allies: {
      tomoshigoke: {
        id: 'tomoshigoke', currentHp: 72, vitality: 100, guarding: false, pollution: 0,
      },
      numakuguri: {
        id: 'numakuguri', currentHp: 108, vitality: 100, guarding: false, pollution: 0,
      },
      sumiwatari: {
        id: 'sumiwatari', currentHp: 80, vitality: 100, guarding: false, pollution: 0,
      },
    },
    targets: {
      nigorigui: { id: 'nigorigui', currentHp: 180, armored: false },
      'left-pollution-mass': {
        id: 'left-pollution-mass', currentHp: 35, armored: true,
      },
      'right-pollution-mass': {
        id: 'right-pollution-mass', currentHp: 35, armored: true,
      },
    },
    plans: defaultPlans(),
    supportPlan: 'none',
    outletsObserved: false,
    outletProgress: 0,
    burstWarned: false,
    overload: 100,
    vigilance: 80,
    calmed: false,
    outcome: 'ongoing',
    lastLog: ['ニゴリグイの左右の排出口が、黒い汚染塊に覆われています。'],
  }
}

function nextRandom(seed: number): { seed: number; factor: number } {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0
  return { seed: nextSeed, factor: 0.95 + (nextSeed / 0xffffffff) * 0.1 }
}

function isPollutionMass(targetId: CoreBossPlanTargetId): targetId is typeof pollutionMassIds[number] {
  return targetId === 'left-pollution-mass' || targetId === 'right-pollution-mass'
}

function isValidPlan(
  actorId: AllyCombatantId,
  plan: CoreBossPlannedAction,
): boolean {
  if (plan.kind === 'basic') return Object.hasOwn(coreBossTargetNames, plan.targetId)
  if (plan.kind === 'defend') return plan.targetId === actorId
  if (skillDefinitions[plan.skillId].actorId !== actorId) return false
  if (plan.skillId === 'calming-glimmer') return plan.targetId === 'nigorigui'
  if (plan.skillId === 'burrow-guard') {
    return allyIds.includes(plan.targetId as AllyCombatantId) && plan.targetId !== actorId
  }
  return (
    allyIds.includes(plan.targetId as AllyCombatantId) ||
    Object.hasOwn(coreBossTargetNames, plan.targetId)
  )
}

function isValidSupport(state: CoreBossBattleState, support: CoreBossSupport): boolean {
  if (support === 'none') return true
  if (state.stage === 1) {
    if (support === 'observe-outlets') return !state.outletsObserved
    if (support === 'rekimatoi-left') {
      const target = state.targets['left-pollution-mass']
      return state.outletsObserved && target.currentHp > 0 && target.armored
    }
    if (support === 'rekimatoi-right') {
      const target = state.targets['right-pollution-mass']
      return state.outletsObserved && target.currentHp > 0 && target.armored
    }
    return false
  }
  if (state.stage === 2) {
    if (support === 'analyze-control') return state.outletProgress === 0
    if (support === 'open-outlet') return state.outletProgress === 1
    return false
  }
  return support === 'connect-purification' && canConnectPurification(state)
}

export function canConnectPurification(state: CoreBossBattleState): boolean {
  return (
    state.stage === 3 &&
    state.outletProgress === 2 &&
    state.overload <= 20 &&
    state.vigilance <= 20 &&
    state.calmed &&
    state.outcome === 'ongoing'
  )
}

export function canCommitCoreBossRound(state: CoreBossBattleState): boolean {
  if (state.outcome !== 'ongoing' || state.phase !== 'planning') return false
  if (!isValidSupport(state, state.supportPlan)) return false
  return allyIds.every((actorId) => {
    const actor = state.allies[actorId]
    const plan = state.plans[actorId]
    if (actor.currentHp <= 0) return true
    if (!isValidPlan(actorId, plan)) return false
    if (plan.kind !== 'skill') return true
    return actor.vitality >= skillDefinitions[plan.skillId].vitalityCost
  })
}

function applySupport(state: CoreBossBattleState, log: string[]) {
  switch (state.supportPlan) {
    case 'none':
      return
    case 'observe-outlets':
      state.outletsObserved = true
      log.push('排出口を観察し、汚染塊の装甲を礫砕きで外せると判明しました。')
      return
    case 'rekimatoi-left':
      state.targets['left-pollution-mass'].armored = false
      log.push('レキマトイの礫砕きが、左側の汚染塊の装甲を外しました。')
      return
    case 'rekimatoi-right':
      state.targets['right-pollution-mass'].armored = false
      log.push('レキマトイの礫砕きが、右側の汚染塊の装甲を外しました。')
      return
    case 'analyze-control':
      state.outletProgress = 1
      state.burstWarned = true
      log.push('制御盤を解析しました。ニゴリグイが次ラウンドの「排出暴発」を予告しています。')
      return
    case 'open-outlet':
      state.outletProgress = 2
      state.stage = 3
      log.push('中央排出路を開放しました。過負荷を安全に逃がせます。')
      return
    case 'connect-purification':
      return
  }
}

function applyClarifyingFlow(
  state: CoreBossBattleState,
  targetId: CoreBossPlanTargetId,
  log: string[],
) {
  if (allyIds.includes(targetId as AllyCombatantId)) {
    const allyId = targetId as AllyCombatantId
    const ally = state.allies[allyId]
    const removed = ally.pollution
    ally.pollution = 0
    ally.currentHp = Math.min(combatants[allyId].maxHp, ally.currentHp + 8)
    log.push(`スミワタリの「澄み流し」。${combatants[allyId].name}の汚染${removed}段階を除去しました。`)
    return
  }
  if (targetId === 'nigorigui') {
    if (state.stage !== 3) {
      log.push('排出路が閉じているため、澄み流しを安全に通せません。')
      return
    }
    const before = state.overload
    state.overload = Math.max(0, state.overload - 30)
    log.push(`澄み流しでニゴリグイの過負荷値が${before - state.overload}低下しました。`)
    return
  }
  if (!isPollutionMass(targetId)) return
  const target = state.targets[targetId]
  if (target.armored) {
    log.push(`${coreBossTargetNames[targetId]}は装甲に覆われ、澄み流しが届きません。`)
    return
  }
  target.currentHp = 0
  log.push(`澄み流しで${coreBossTargetNames[targetId]}を洗い落としました。`)
}

function applyBasicAttack(
  state: CoreBossBattleState,
  actorId: AllyCombatantId,
  targetId: CoreBossTargetId,
  log: string[],
) {
  const actor = state.allies[actorId]
  actor.vitality = Math.min(100, actor.vitality + 20)
  const target = state.targets[targetId]
  if (target.armored) {
    log.push(`${combatants[actorId].name}の攻撃は${coreBossTargetNames[targetId]}の装甲に阻まれました。`)
    return
  }
  const random = nextRandom(state.randomSeed)
  state.randomSeed = random.seed
  const definition = combatants[actorId]
  const defense = targetId === 'nigorigui' ? 30 : 12
  const offense = definition.basicType === 'physical' ? definition.attack : definition.sense
  const amount = Math.max(
    1,
    Math.floor(definition.basicPower * ((50 + offense) / (50 + defense)) * random.factor),
  )
  target.currentHp = Math.max(0, target.currentHp - amount)
  if (targetId === 'nigorigui') {
    state.vigilance = Math.min(100, state.vigilance + 20)
  }
  log.push(`${definition.name}の攻撃。${coreBossTargetNames[targetId]}へ${amount}の被害。`)
}

function applyPollutionMasses(state: CoreBossBattleState, log: string[]) {
  const remaining = pollutionMassIds.filter((id) => state.targets[id].currentHp > 0).length
  if (remaining === 0) return
  state.overload = Math.min(
    CORE_BOSS_OVERLOAD_LIMIT,
    state.overload + remaining * 10,
  )
  for (const allyId of allyIds) {
    const ally = state.allies[allyId]
    if (ally.currentHp <= 0) continue
    ally.pollution = Math.min(3, ally.pollution + remaining)
    ally.vitality = Math.max(0, ally.vitality - remaining * 5)
  }
  log.push(`残った汚染塊${remaining}個が汚染を散布し、過負荷値が${remaining * 10}上昇しました。`)
}

function failWhenPurificationIsImpossible(
  state: CoreBossBattleState,
  log: string[],
): boolean {
  if (state.stage !== 3) return false

  if (state.overload > 20 && state.allies.sumiwatari.currentHp <= 0) {
    state.outcome = 'party-defeated'
    log.push(
      'スミワタリが行動不能となり、残る過負荷を下げられません。調査失敗・緊急帰還です。',
    )
    return true
  }

  if (
    (state.vigilance > 20 || !state.calmed) &&
    state.allies.tomoshigoke.currentHp <= 0
  ) {
    state.outcome = 'party-defeated'
    log.push(
      'トモシゴケが行動不能となり、ニゴリグイの鎮静を完了できません。調査失敗・緊急帰還です。',
    )
    return true
  }

  return false
}

function applyBossAction(
  state: CoreBossBattleState,
  burstDue: boolean,
  allDefending: boolean,
  protectedTarget: AllyCombatantId | null,
  log: string[],
) {
  if (burstDue) {
    log.push('ニゴリグイの「排出暴発」。濁流が前衛全体を襲います。')
    for (const allyId of allyIds) {
      const ally = state.allies[allyId]
      if (ally.currentHp <= 0) continue
      const amount = ally.guarding ? 22 : 56
      ally.currentHp = Math.max(0, ally.currentHp - amount)
      log.push(`${combatants[allyId].name}は${amount}の生態被害を受けました。`)
    }
    state.burstWarned = false
    if (allDefending) {
      state.overload = Math.max(0, state.overload - 20)
      log.push('全員が防御し、安全な排出に成功しました。過負荷値が20低下しました。')
    }
    return
  }

  const originalTarget: AllyCombatantId = state.round % 2 === 0 ? 'sumiwatari' : 'tomoshigoke'
  const intercepts = protectedTarget === originalTarget
  const targetId: AllyCombatantId = intercepts ? 'numakuguri' : originalTarget
  const target = state.allies[targetId]
  if (target.currentHp <= 0) return
  const random = nextRandom(state.randomSeed)
  state.randomSeed = random.seed
  let amount = Math.max(1, Math.floor(16 * random.factor * (target.guarding ? 0.6 : 1)))
  if (intercepts) amount = Math.max(1, Math.floor(amount * 0.8))
  target.currentHp = Math.max(0, target.currentHp - amount)
  log.push(
    intercepts
      ? `ヌマクグリが濁尾打ちを引き受け、${amount}の被害を受けました。`
      : `ニゴリグイの「濁尾打ち」。${combatants[targetId].name}は${amount}の被害を受けました。`,
  )
}

function resolveRound(state: CoreBossBattleState): CoreBossBattleState {
  if (state.outcome !== 'ongoing' || state.phase !== 'committed') return state
  const next: CoreBossBattleState = {
    ...state,
    allies: Object.fromEntries(
      Object.entries(state.allies).map(([id, ally]) => [id, { ...ally, guarding: false }]),
    ) as CoreBossBattleState['allies'],
    targets: {
      nigorigui: { ...state.targets.nigorigui },
      'left-pollution-mass': { ...state.targets['left-pollution-mass'] },
      'right-pollution-mass': { ...state.targets['right-pollution-mass'] },
    },
    lastLog: [],
  }
  const log = next.lastLog
  if (next.supportPlan === 'connect-purification' && canConnectPurification(next)) {
    return {
      ...next,
      outcome: 'secured',
      lastLog: ['浄化経路を接続しました。ニゴリグイは通常の濾過行動へ戻りました。'],
    }
  }

  const burstDue = next.burstWarned
  applySupport(next, log)
  let protectedTarget: AllyCombatantId | null = null
  for (const actorId of allyIds) {
    const actor = next.allies[actorId]
    if (actor.currentHp <= 0) continue
    const plan = next.plans[actorId]
    if (plan.kind === 'defend') {
      actor.guarding = true
      actor.vitality = Math.min(100, actor.vitality + 25)
      log.push(`${combatants[actorId].name}は防御しました。`)
      continue
    }
    if (plan.kind === 'skill') {
      actor.vitality -= skillDefinitions[plan.skillId].vitalityCost
      if (plan.skillId === 'calming-glimmer') {
        if (next.stage === 3) {
          next.calmed = true
          next.vigilance = Math.max(0, next.vigilance - 20)
          log.push('静かな明滅がニゴリグイを鎮め、警戒度が20低下しました。')
        } else {
          log.push('排出口の苦痛が強く、静かな明滅に応じられません。')
        }
      } else if (plan.skillId === 'burrow-guard') {
        protectedTarget = plan.targetId as AllyCombatantId
        log.push(`ヌマクグリは${combatants[protectedTarget].name}をかばいます。`)
      } else {
        applyClarifyingFlow(next, plan.targetId, log)
      }
      continue
    }
    applyBasicAttack(next, actorId, plan.targetId, log)
  }

  if (next.targets.nigorigui.currentHp <= 0) {
    next.outcome = 'ecosystem-damaged'
    log.push('ニゴリグイの生命核を損傷しました。生態保全経路を失っています。')
    return next
  }

  if (next.stage === 1) {
    applyPollutionMasses(next, log)
    if (next.overload >= CORE_BOSS_OVERLOAD_LIMIT) {
      next.outcome = 'ecosystem-damaged'
      log.push('施設の過負荷が許容上限に達し、生態保全経路を維持できません。')
      return next
    }
    if (pollutionMassIds.every((id) => next.targets[id].currentHp <= 0)) {
      next.stage = 2
      log.push('左右の汚染塊を除去しました。中央排出路の制御盤を操作できます。')
    }
  }

  const allDefending = allyIds.every(
    (id) => next.allies[id].currentHp <= 0 || next.plans[id].kind === 'defend',
  )
  applyBossAction(next, burstDue, allDefending, protectedTarget, log)

  if (allyIds.every((id) => next.allies[id].currentHp <= 0)) {
    next.outcome = 'party-defeated'
    log.push('前衛がすべて戦闘不能になりました。調査失敗・緊急帰還です。')
    return next
  }

  if (failWhenPurificationIsImpossible(next, log)) return next

  next.round += 1
  next.supportPlan = 'none'
  next.phase = 'planning'
  return next
}

export function updateCoreBossBattle(
  state: CoreBossBattleState,
  command: CoreBossBattleCommand,
): CoreBossBattleState {
  if (state.outcome !== 'ongoing') return state
  switch (command.type) {
    case 'setSupport':
      if (state.phase !== 'planning' || state.supportPlan === command.support) return state
      return { ...state, supportPlan: command.support }
    case 'setPlan': {
      if (state.phase !== 'planning' || state.allies[command.actorId].currentHp <= 0) {
        return state
      }
      if (!isValidPlan(command.actorId, command.plan)) return state
      const current = state.plans[command.actorId]
      if (JSON.stringify(current) === JSON.stringify(command.plan)) return state
      return { ...state, plans: { ...state.plans, [command.actorId]: command.plan } }
    }
    case 'commitRound':
      return canCommitCoreBossRound(state) ? { ...state, phase: 'committed' } : state
    case 'resolveRound':
      return resolveRound(state)
  }
}
