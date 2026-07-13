import { allyIds, combatants, skillDefinitions } from './data'
import type {
  AllyCombatantId,
  WaterwayApproach,
  WaterwayBattleCommand,
  WaterwayBattleState,
  WaterwayPlanTargetId,
  WaterwayPlannedAction,
  WaterwayTargetId,
} from './types'

const targetNames: Record<WaterwayTargetId, string> = {
  'pollution-mass': '汚染塊',
  'polluted-sumiwatari': '汚染された野生スミワタリ',
}

const targetMaxHp: Record<WaterwayTargetId, number> = {
  'pollution-mass': 50,
  'polluted-sumiwatari': 70,
}

function defaultPlans(): Record<AllyCombatantId, WaterwayPlannedAction> {
  return {
    tomoshigoke: { kind: 'defend', targetId: 'tomoshigoke' },
    numakuguri: { kind: 'defend', targetId: 'numakuguri' },
    sumiwatari: { kind: 'defend', targetId: 'sumiwatari' },
  }
}

export function createWaterwayBattleState(
  approach: WaterwayApproach,
): WaterwayBattleState {
  const observedSource = approach === 'observe-intake'
  return {
    kind: 'sunken-waterway',
    phase: 'planning',
    round: 1,
    randomSeed: 91827,
    approach,
    allies: {
      tomoshigoke: {
        id: 'tomoshigoke', currentHp: 72, vitality: 60, guarding: false,
        pollution: approach === 'hurry-to-valve' ? 1 : 0,
      },
      numakuguri: {
        id: 'numakuguri', currentHp: 108, vitality: 60, guarding: false,
        pollution: 0,
      },
      sumiwatari: {
        id: 'sumiwatari', currentHp: 80, vitality: 100, guarding: false,
        pollution: 0,
      },
    },
    targets: {
      'pollution-mass': {
        id: 'pollution-mass',
        currentHp: targetMaxHp['pollution-mass'],
        pollution: observedSource ? 60 : 80,
      },
      'polluted-sumiwatari': {
        id: 'polluted-sumiwatari',
        currentHp: targetMaxHp['polluted-sumiwatari'],
        pollution: 60,
      },
    },
    plans: defaultPlans(),
    supportPlan: 'none',
    vigilance: observedSource ? 40 : 60,
    calmed: false,
    observedSource,
    outcome: 'ongoing',
    lastLog: [
      observedSource
        ? '取水桝の流れから汚染源を特定しました。汚染塊への最初の浄化が強まります。'
        : '下流弁へ急いだため、汚染源を見失い、トモシゴケへ汚染が付着しました。',
    ],
  }
}

function nextRandom(seed: number): { seed: number; factor: number } {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0
  return { seed: nextSeed, factor: 0.95 + (nextSeed / 0xffffffff) * 0.1 }
}

function damage(
  power: number,
  offense: number,
  defense: number,
  factor: number,
  guarding: boolean,
): number {
  const raw = Math.floor(power * ((50 + offense) / (50 + defense)) * factor)
  return Math.max(1, Math.floor(raw * (guarding ? 0.6 : 1)))
}

function isValidPlan(
  actorId: AllyCombatantId,
  plan: WaterwayPlannedAction,
): boolean {
  if (plan.kind === 'basic') return Object.hasOwn(targetNames, plan.targetId)
  if (plan.kind === 'defend') return plan.targetId === actorId
  if (skillDefinitions[plan.skillId].actorId !== actorId) return false
  if (plan.skillId === 'calming-glimmer') {
    return plan.targetId === 'polluted-sumiwatari'
  }
  if (plan.skillId === 'burrow-guard') {
    return allyIds.includes(plan.targetId as AllyCombatantId) && plan.targetId !== actorId
  }
  return (
    allyIds.includes(plan.targetId as AllyCombatantId) ||
    Object.hasOwn(targetNames, plan.targetId)
  )
}

export function canSecureWaterway(state: WaterwayBattleState): boolean {
  return (
    state.targets['pollution-mass'].pollution === 0 &&
    state.targets['polluted-sumiwatari'].pollution === 0 &&
    state.vigilance <= 20 &&
    state.calmed &&
    state.outcome === 'ongoing'
  )
}

export function canCommitWaterwayRound(state: WaterwayBattleState): boolean {
  if (state.outcome !== 'ongoing' || state.phase !== 'planning') return false
  if (state.supportPlan === 'indicate-safe-route' && !canSecureWaterway(state)) {
    return false
  }
  return allyIds.every((actorId) => {
    const actor = state.allies[actorId]
    const plan = state.plans[actorId]
    if (actor.currentHp <= 0) return true
    if (!isValidPlan(actorId, plan)) return false
    if (plan.kind !== 'skill') return true
    return actor.vitality >= skillDefinitions[plan.skillId].vitalityCost
  })
}

function applyClarifyingFlow(
  state: WaterwayBattleState,
  targetId: WaterwayPlanTargetId,
  log: string[],
) {
  if (allyIds.includes(targetId as AllyCombatantId)) {
    const allyId = targetId as AllyCombatantId
    const ally = state.allies[allyId]
    const removed = ally.pollution
    ally.pollution = 0
    ally.currentHp = Math.min(combatants[allyId].maxHp, ally.currentHp + 8)
    log.push(`スミワタリの「澄み流し」。${combatants[allyId].name}の汚染${removed}段階を除去。`)
    return
  }
  const waterwayTargetId = targetId as WaterwayTargetId
  const target = state.targets[waterwayTargetId]
  const amount = waterwayTargetId === 'pollution-mass' && state.observedSource ? 60 : 40
  const before = target.pollution
  target.pollution = Math.max(0, target.pollution - amount)
  log.push(`スミワタリの「澄み流し」。${targetNames[waterwayTargetId]}の汚染値が${before - target.pollution}低下。`)
  if (waterwayTargetId === 'pollution-mass' && before > 0 && target.pollution === 0) {
    state.vigilance = Math.max(0, state.vigilance - 10)
    log.push('汚染の拡散が止まり、野生個体の警戒度が10下がりました。')
  }
}

function applyPollutionMass(state: WaterwayBattleState, log: string[]) {
  if (state.targets['pollution-mass'].pollution === 0) return
  log.push('汚染塊が黒い沈殿を拡散しました。')
  for (const allyId of allyIds) {
    const ally = state.allies[allyId]
    if (ally.currentHp <= 0) continue
    ally.pollution = Math.min(3, ally.pollution + 1)
    ally.vitality = Math.max(0, ally.vitality - 10)
  }
}

function applyWildSumiwatari(
  state: WaterwayBattleState,
  protectedTarget: AllyCombatantId | null,
  log: string[],
) {
  const originalTarget: AllyCombatantId = 'tomoshigoke'
  const intercepts = protectedTarget === originalTarget
  const targetId: AllyCombatantId = intercepts ? 'numakuguri' : originalTarget
  const target = state.allies[targetId]
  const random = nextRandom(state.randomSeed)
  state.randomSeed = random.seed
  let amount = damage(
    14,
    38,
    combatants[targetId].resistance,
    random.factor,
    target.guarding,
  )
  if (intercepts) amount = Math.max(1, Math.floor(amount * 0.8))
  target.currentHp = Math.max(0, target.currentHp - amount)
  log.push(
    intercepts
      ? `ヌマクグリが濁流弾を引き受け、${amount}の生態被害。`
      : `野生スミワタリの「濁流弾」。トモシゴケは${amount}の生態被害。`,
  )
}

function resolveRound(state: WaterwayBattleState): WaterwayBattleState {
  if (state.outcome !== 'ongoing' || state.phase !== 'committed') return state
  const next: WaterwayBattleState = {
    ...state,
    allies: Object.fromEntries(
      Object.entries(state.allies).map(([id, ally]) => [id, { ...ally, guarding: false }]),
    ) as WaterwayBattleState['allies'],
    targets: {
      'pollution-mass': { ...state.targets['pollution-mass'] },
      'polluted-sumiwatari': { ...state.targets['polluted-sumiwatari'] },
    },
    lastLog: [],
  }
  const log = next.lastLog

  if (next.supportPlan === 'indicate-safe-route' && canSecureWaterway(next)) {
    return {
      ...next,
      outcome: 'secured',
      lastLog: ['澄んだ流路を示すと、野生スミワタリは汚染塊から離れ、下流へ泳ぎ出しました。'],
    }
  }

  let protectedTarget: AllyCombatantId | null = null
  for (const actorId of allyIds) {
    const actor = next.allies[actorId]
    if (actor.currentHp <= 0) continue
    const plan = next.plans[actorId]
    if (plan.kind === 'defend') {
      actor.guarding = true
      actor.vitality = Math.min(100, actor.vitality + 25)
      log.push(`${combatants[actorId].name}は防御し、活性値を蓄えました。`)
      continue
    }
    if (plan.kind === 'skill') {
      actor.vitality -= skillDefinitions[plan.skillId].vitalityCost
      if (plan.skillId === 'calming-glimmer') {
        next.calmed = true
        next.vigilance = Math.max(0, next.vigilance - 20)
        log.push('トモシゴケの「静かな明滅」。警戒度が20下がりました。')
      } else if (plan.skillId === 'burrow-guard') {
        protectedTarget = plan.targetId as AllyCombatantId
        log.push(`ヌマクグリが${combatants[protectedTarget].name}をかばいます。`)
      } else {
        applyClarifyingFlow(next, plan.targetId, log)
      }
      continue
    }
    actor.vitality = Math.min(100, actor.vitality + 20)
    const target = next.targets[plan.targetId]
    const random = nextRandom(next.randomSeed)
    next.randomSeed = random.seed
    const definition = combatants[actorId]
    const amount = damage(
      definition.basicPower,
      definition.basicType === 'physical' ? definition.attack : definition.sense,
      plan.targetId === 'pollution-mass' ? 32 : 24,
      random.factor,
      false,
    )
    target.currentHp = Math.max(0, target.currentHp - amount)
    next.vigilance = Math.min(100, next.vigilance + 10)
    log.push(`${definition.name}の「${definition.basicName}」。${targetNames[plan.targetId]}へ${amount}の被害。`)
  }

  applyPollutionMass(next, log)
  applyWildSumiwatari(next, protectedTarget, log)

  if (Object.values(next.targets).some((target) => target.currentHp <= 0)) {
    next.outcome = 'ecosystem-damaged'
    log.push('調査対象を傷つけすぎました。生態保全経路を失っています。')
    return next
  }
  if (allyIds.every((id) => next.allies[id].currentHp <= 0)) {
    next.outcome = 'party-defeated'
    log.push('前衛がすべて戦闘不能になりました。')
    return next
  }

  for (const allyId of allyIds) {
    const ally = next.allies[allyId]
    if (ally.pollution > 0) ally.vitality = Math.max(0, ally.vitality - 5)
  }
  next.round += 1
  next.supportPlan = 'none'
  next.phase = 'planning'
  return next
}

export function updateWaterwayBattle(
  state: WaterwayBattleState,
  command: WaterwayBattleCommand,
): WaterwayBattleState {
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
      return canCommitWaterwayRound(state) ? { ...state, phase: 'committed' } : state
    case 'resolveRound':
      return resolveRound(state)
  }
}

export { targetMaxHp, targetNames }
