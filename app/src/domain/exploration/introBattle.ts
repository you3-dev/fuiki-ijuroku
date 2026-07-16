import type {
  IntroBattleAllyId,
  IntroBattlePlan,
  IntroBattleState,
} from './types'

const attackDamage: Record<IntroBattleAllyId, number> = {
  tomoshigoke: 14,
  numakuguri: 16,
}

const planActor: Partial<Record<IntroBattlePlan, IntroBattleAllyId>> = {
  'moss-droplet': 'tomoshigoke',
  'calming-glimmer': 'tomoshigoke',
  'burrow-guard': 'numakuguri',
  'mud-screen': 'numakuguri',
}

const planCost: Partial<Record<IntroBattlePlan, number>> = {
  'moss-droplet': 25,
  'calming-glimmer': 20,
  'burrow-guard': 20,
  'mud-screen': 25,
}

function addVitality(value: number, amount: number): number {
  return Math.min(100, value + amount)
}

export function canSetIntroBattlePlan(
  battle: IntroBattleState,
  actorId: IntroBattleAllyId,
  plan: IntroBattlePlan,
): boolean {
  if (battle.outcome !== 'ongoing') return false
  const requiredActor = planActor[plan]
  if (requiredActor && requiredActor !== actorId) return false
  const cost = planCost[plan] ?? 0
  if (battle.allies[actorId].vitality < cost) return false
  if (
    plan === 'moss-droplet' &&
    Object.values(battle.allies).every((ally) => ally.currentHp >= ally.maxHp)
  ) {
    return false
  }
  return true
}

export function setIntroBattlePlan(
  battle: IntroBattleState,
  actorId: IntroBattleAllyId,
  plan: IntroBattlePlan,
): IntroBattleState {
  if (!canSetIntroBattlePlan(battle, actorId, plan)) return battle
  if (battle.plans[actorId] === plan) return battle
  return {
    ...battle,
    plans: { ...battle.plans, [actorId]: plan },
  }
}

export function canResolveIntroBattleRound(battle: IntroBattleState): boolean {
  return (
    battle.outcome === 'ongoing' &&
    battle.plans.tomoshigoke !== null &&
    battle.plans.numakuguri !== null
  )
}

export function resolveIntroBattleRound(battle: IntroBattleState): IntroBattleState {
  if (!canResolveIntroBattleRound(battle)) return battle

  const allies = {
    tomoshigoke: { ...battle.allies.tomoshigoke },
    numakuguri: { ...battle.allies.numakuguri },
  }
  let enemyHp = battle.enemyHp
  const log: string[] = []
  let enemyCalmed = false
  let enemyMuddied = false
  let burrowGuard = false

  for (const actorId of ['tomoshigoke', 'numakuguri'] as const) {
    const plan = battle.plans[actorId]
    if (!plan) continue
    switch (plan) {
      case 'attack': {
        const damage = attackDamage[actorId]
        enemyHp = Math.max(0, enemyHp - damage)
        allies[actorId].vitality = addVitality(allies[actorId].vitality, 20)
        const name = actorId === 'tomoshigoke' ? '灯角突き' : '大尾打ち'
        log.push(`${name}！ キリハネに${damage}ダメージ。`)
        break
      }
      case 'defend':
        allies[actorId].vitality = addVitality(allies[actorId].vitality, 25)
        log.push(`${actorId === 'tomoshigoke' ? 'トモシゴケ' : 'ヌマクグリ'}は身を守った。`)
        break
      case 'moss-droplet': {
        allies.tomoshigoke.vitality -= 25
        const targetId =
          allies.tomoshigoke.maxHp - allies.tomoshigoke.currentHp >=
          allies.numakuguri.maxHp - allies.numakuguri.currentHp
            ? 'tomoshigoke'
            : 'numakuguri'
        const before = allies[targetId].currentHp
        allies[targetId].currentHp = Math.min(allies[targetId].maxHp, before + 24)
        const healed = allies[targetId].currentHp - before
        log.push(`灯苔の雫。${targetId === 'tomoshigoke' ? 'トモシゴケ' : 'ヌマクグリ'}のHPが${healed}回復。`)
        break
      }
      case 'calming-glimmer':
        allies.tomoshigoke.vitality -= 20
        enemyCalmed = true
        log.push('静かな明滅が、キリハネの勢いを弱めた。')
        break
      case 'burrow-guard':
        allies.numakuguri.vitality -= 20
        burrowGuard = true
        log.push('ヌマクグリが身代わり潜行で仲間の前へ出た。')
        break
      case 'mud-screen':
        allies.numakuguri.vitality -= 25
        enemyMuddied = true
        log.push('泥幕がキリハネの視界を遮った。')
        break
    }
  }

  if (enemyHp === 0) {
    log.push('若いキリハネは戦意を失い、霧の奥へ退いた。')
    return {
      ...battle,
      enemyHp,
      allies,
      outcome: 'victory',
      plans: { tomoshigoke: null, numakuguri: null },
      lastLog: log,
    }
  }

  const intendedTarget: IntroBattleAllyId =
    battle.round % 2 === 1 ? 'tomoshigoke' : 'numakuguri'
  const targetId = intendedTarget === 'tomoshigoke' && burrowGuard
    ? 'numakuguri'
    : intendedTarget
  let incomingDamage = 18 - (enemyCalmed ? 6 : 0) - (enemyMuddied ? 4 : 0)
  if (battle.plans[targetId] === 'defend') incomingDamage = Math.floor(incomingDamage * 0.6)
  if (burrowGuard && targetId === 'numakuguri') incomingDamage = Math.floor(incomingDamage * 0.8)
  incomingDamage = Math.max(1, incomingDamage)
  allies[targetId].currentHp = Math.max(0, allies[targetId].currentHp - incomingDamage)
  log.push(`キリハネの翅刃。${targetId === 'tomoshigoke' ? 'トモシゴケ' : 'ヌマクグリ'}は${incomingDamage}ダメージ。`)

  return {
    ...battle,
    round: battle.round + 1,
    enemyHp,
    allies,
    plans: { tomoshigoke: null, numakuguri: null },
    lastLog: log,
  }
}
