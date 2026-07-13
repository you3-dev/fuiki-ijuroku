import { allyIds, combatants, skillDefinitions } from './data'
import type {
  AllyCombatantId,
  BattleCommand,
  PlannedAction,
  TowerBattleState,
} from './types'

function defaultPlans(): Record<AllyCombatantId, PlannedAction> {
  return {
    tomoshigoke: { kind: 'defend', targetId: 'tomoshigoke' },
    numakuguri: { kind: 'defend', targetId: 'numakuguri' },
    sumiwatari: { kind: 'defend', targetId: 'sumiwatari' },
  }
}

export function createTowerBattleState(): TowerBattleState {
  return {
    kind: 'observation-tower',
    phase: 'planning',
    round: 1,
    randomSeed: 73421,
    combatants: {
      tomoshigoke: { id: 'tomoshigoke', currentHp: 72, vitality: 40, guarding: false },
      numakuguri: { id: 'numakuguri', currentHp: 108, vitality: 40, guarding: false },
      sumiwatari: { id: 'sumiwatari', currentHp: 80, vitality: 40, guarding: false },
      kirihane: { id: 'kirihane', currentHp: 68, vitality: 40, guarding: false },
    },
    plans: defaultPlans(),
    supportPlan: 'none',
    mistTurns: 2,
    vigilance: 60,
    callObserved: false,
    echoedCall: false,
    calmed: false,
    outcome: 'ongoing',
    lastLog: ['キリハネが濃い霧を広げ、櫓の上から短い周期で鳴いています。'],
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

function isDamaging(plan: PlannedAction): boolean {
  return plan.kind === 'basic'
}

function isValidPlan(actorId: AllyCombatantId, plan: PlannedAction): boolean {
  if (plan.kind === 'basic') return plan.targetId === 'kirihane'
  if (plan.kind === 'defend') return plan.targetId === actorId
  if (skillDefinitions[plan.skillId].actorId !== actorId) return false
  if (plan.skillId === 'calming-glimmer') return plan.targetId === 'kirihane'
  if (plan.skillId === 'burrow-guard') {
    return allyIds.includes(plan.targetId as AllyCombatantId) && plan.targetId !== actorId
  }
  return allyIds.includes(plan.targetId as AllyCombatantId)
}

function actionPriority(state: TowerBattleState, actorId: AllyCombatantId | 'kirihane') {
  if (actorId === 'kirihane') return 20
  const plan = state.plans[actorId]
  if (plan.kind === 'defend') return 70
  if (plan.kind === 'skill') {
    if (plan.skillId === 'burrow-guard') return 80
    if (plan.skillId === 'calming-glimmer') return 60
    return 50
  }
  return 10
}

export function canRequestTowerCooperation(state: TowerBattleState): boolean {
  return (
    state.callObserved &&
    state.echoedCall &&
    state.calmed &&
    state.vigilance <= 20 &&
    state.outcome === 'ongoing'
  )
}

export function canCommitTowerRound(state: TowerBattleState): boolean {
  if (state.outcome !== 'ongoing' || state.phase !== 'planning') return false
  return allyIds.every((actorId) => {
    const actor = state.combatants[actorId]
    const plan = state.plans[actorId]
    if (actor.currentHp <= 0) return true
    if (!isValidPlan(actorId, plan)) return false
    if (plan.kind !== 'skill') return true
    const skill = skillDefinitions[plan.skillId]
    return skill.actorId === actorId && actor.vitality >= skill.vitalityCost
  })
}

function applyEnemyAction(
  state: TowerBattleState,
  combatantStates: TowerBattleState['combatants'],
  protectedTarget: AllyCombatantId | null,
  log: string[],
): number {
  let seed = state.randomSeed
  const enemy = combatants.kirihane
  if (state.mistTurns === 0) {
    state.mistTurns = 3
    log.push('キリハネの「霧包み」。戦場が再び霧中になります。')
    return seed
  }
  if (state.round % 2 === 1) {
    log.push('キリハネの「霧裂き」が前衛全体を包みます。')
    for (const targetId of allyIds) {
      const targetState = combatantStates[targetId]
      if (targetState.currentHp <= 0) continue
      const random = nextRandom(seed)
      seed = random.seed
      const amount = damage(
        12,
        enemy.sense,
        combatants[targetId].resistance,
        random.factor,
        targetState.guarding,
      )
      targetState.currentHp = Math.max(0, targetState.currentHp - amount)
      log.push(`${combatants[targetId].name}は${amount}の生態被害。`)
    }
  } else {
    const originalTarget: AllyCombatantId = 'tomoshigoke'
    const intercepts = protectedTarget === originalTarget
    const targetId: AllyCombatantId = intercepts ? 'numakuguri' : originalTarget
    const targetState = combatantStates[targetId]
    const random = nextRandom(seed)
    seed = random.seed
    let amount = damage(
      17,
      enemy.sense,
      combatants[targetId].resistance,
      random.factor,
      targetState.guarding,
    )
    if (intercepts) amount = Math.max(1, Math.floor(amount * 0.8))
    targetState.currentHp = Math.max(0, targetState.currentHp - amount)
    log.push(
      intercepts
        ? `ヌマクグリが「翅刃」を引き受け、${amount}の生態被害。`
        : `キリハネの「翅刃」。トモシゴケは${amount}の生態被害。`,
    )
  }
  return seed
}

function resolveRound(state: TowerBattleState): TowerBattleState {
  if (state.outcome !== 'ongoing' || state.phase !== 'committed') return state

  const next: TowerBattleState = {
    ...state,
    combatants: Object.fromEntries(
      Object.entries(state.combatants).map(([id, unit]) => [
        id,
        { ...unit, guarding: false },
      ]),
    ) as TowerBattleState['combatants'],
    lastLog: [],
  }
  const log = next.lastLog
  const plans = Object.values(next.plans)
  const noAttack = plans.every((plan) => !isDamaging(plan))
  const allDefending = plans.every((plan) => plan.kind === 'defend')

  if (next.supportPlan === 'request-cooperation' && canRequestTowerCooperation(next)) {
    return {
      ...next,
      outcome: 'cooperation',
      lastLog: ['同じ周期の音へキリハネが応え、霧の外へ主人公たちを導きました。'],
    }
  }

  if (next.supportPlan === 'observe-call') {
    if (next.mistTurns > 0 && allDefending) {
      next.callObserved = true
      next.vigilance = Math.max(0, next.vigilance - 10)
      log.push('攻撃せずに霧中の鳴き声を観察し、周期を記録しました。')
    } else {
      next.vigilance = Math.min(100, next.vigilance + 10)
      log.push('攻撃音に鳴き声が紛れ、周期を記録できませんでした。')
    }
  }
  if (next.supportPlan === 'calming-chime') {
    if (next.callObserved && noAttack) {
      next.echoedCall = true
      next.vigilance = Math.max(0, next.vigilance - 20)
      log.push('鎮静音具で記録した周期を返しました。キリハネが高度を下げます。')
    } else {
      log.push('鳴き声の記録が足りず、鎮静音具の周期が合いません。')
    }
  }

  let protectedTarget: AllyCombatantId | null = null
  const turnOrder: Array<AllyCombatantId | 'kirihane'> = [...allyIds, 'kirihane']
  turnOrder.sort((left, right) => {
    const priorityDifference = actionPriority(next, right) - actionPriority(next, left)
    if (priorityDifference !== 0) return priorityDifference
    const agilityDifference = combatants[right].agility - combatants[left].agility
    return agilityDifference !== 0 ? agilityDifference : left.localeCompare(right)
  })

  for (const actorId of turnOrder) {
    if (actorId === 'kirihane') {
      next.randomSeed = applyEnemyAction(
        next,
        next.combatants,
        protectedTarget,
        log,
      )
      if (allyIds.every((id) => next.combatants[id].currentHp <= 0)) break
      continue
    }
    const actorState = next.combatants[actorId]
    if (actorState.currentHp <= 0) continue
    const plan = next.plans[actorId]
    if (plan.kind === 'defend') {
      actorState.guarding = true
      actorState.vitality = Math.min(100, actorState.vitality + 25)
      log.push(`${combatants[actorId].name}は防御し、活性値を蓄えました。`)
      continue
    }
    if (plan.kind === 'skill') {
      const skill = skillDefinitions[plan.skillId]
      actorState.vitality -= skill.vitalityCost
      if (plan.skillId === 'calming-glimmer') {
        next.calmed = true
        next.vigilance = Math.max(0, next.vigilance - 20)
        log.push('トモシゴケの「静かな明滅」。警戒度が20下がりました。')
      } else if (plan.skillId === 'burrow-guard') {
        protectedTarget = plan.targetId as AllyCombatantId
        log.push(`ヌマクグリが${combatants[protectedTarget].name}をかばいます。`)
      } else {
        const targetId = plan.targetId as AllyCombatantId
        const target = next.combatants[targetId]
        const heal = Math.floor(8 * (1 + combatants.sumiwatari.sense / 100))
        target.currentHp = Math.min(combatants[targetId].maxHp, target.currentHp + heal)
        log.push(`スミワタリの「澄み流し」。${combatants[targetId].name}のHPが${heal}回復。`)
      }
      continue
    }

    actorState.vitality = Math.min(100, actorState.vitality + 20)
    const targetState = next.combatants.kirihane
    const random = nextRandom(next.randomSeed)
    next.randomSeed = random.seed
    const actor = combatants[actorId]
    const amount = damage(
      actor.basicPower,
      actor.basicType === 'physical' ? actor.attack : actor.sense,
      actor.basicType === 'physical'
        ? combatants.kirihane.defense
        : combatants.kirihane.resistance,
      random.factor,
      false,
    )
    targetState.currentHp = Math.max(0, targetState.currentHp - amount)
    next.vigilance = Math.min(100, next.vigilance + 10)
    log.push(`${actor.name}の「${actor.basicName}」。キリハネへ${amount}の被害。`)
    if (targetState.currentHp <= 0) break
  }

  if (next.combatants.kirihane.currentHp <= 0) {
    next.outcome = 'enemy-defeated'
    log.push('キリハネは霧の奥へ落下しました。観察経路を失っています。')
    return next
  }

  if (allyIds.every((id) => next.combatants[id].currentHp <= 0)) {
    next.outcome = 'party-defeated'
    log.push('前衛がすべて戦闘不能になりました。')
    return next
  }

  next.round += 1
  next.mistTurns = Math.max(0, next.mistTurns - 1)
  next.supportPlan = 'none'
  next.phase = 'planning'
  return next
}

export function updateTowerBattle(
  state: TowerBattleState,
  command: BattleCommand,
): TowerBattleState {
  if (state.outcome !== 'ongoing') return state
  switch (command.type) {
    case 'setSupport':
      if (state.phase !== 'planning') return state
      if (state.supportPlan === command.support) return state
      return { ...state, supportPlan: command.support }
    case 'setPlan': {
      if (state.phase !== 'planning') return state
      if (state.combatants[command.actorId].currentHp <= 0) return state
      if (!isValidPlan(command.actorId, command.plan)) return state
      const current = state.plans[command.actorId]
      if (JSON.stringify(current) === JSON.stringify(command.plan)) return state
      return {
        ...state,
        plans: { ...state.plans, [command.actorId]: command.plan },
      }
    }
    case 'commitRound':
      return canCommitTowerRound(state) ? { ...state, phase: 'committed' } : state
    case 'resolveRound':
      return resolveRound(state)
  }
}
