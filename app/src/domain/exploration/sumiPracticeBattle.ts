import type {
  SumiPracticeAllyId,
  SumiPracticeBattleState,
  SumiPracticePlan,
} from './types'

const actorPlans: Record<SumiPracticeAllyId, SumiPracticePlan[]> = {
  tomoshigoke: ['attack', 'defend', 'moss-droplet'],
  numakuguri: ['attack', 'defend', 'burrow-guard'],
  sumiwatari: ['attack', 'defend', 'clarifying-flow'],
}

const planCost: Partial<Record<SumiPracticePlan, number>> = {
  'moss-droplet': 25,
  'burrow-guard': 20,
  'clarifying-flow': 25,
}

const attackDamage: Record<SumiPracticeAllyId, number> = {
  tomoshigoke: 14,
  numakuguri: 16,
  sumiwatari: 14,
}

const allyNames: Record<SumiPracticeAllyId, string> = {
  tomoshigoke: 'トモシゴケ',
  numakuguri: 'ヌマクグリ',
  sumiwatari: 'スミワタリ',
}

function addVitality(value: number, amount: number): number {
  return Math.min(100, value + amount)
}

export function canSetSumiPracticePlan(
  battle: SumiPracticeBattleState,
  actorId: SumiPracticeAllyId,
  plan: SumiPracticePlan,
): boolean {
  if (battle.outcome !== 'ongoing' || !actorPlans[actorId].includes(plan)) return false
  const cost = planCost[plan] ?? 0
  if (battle.allies[actorId].vitality < cost) return false
  const allyPolluted = Object.values(battle.allies).some((ally) => ally.polluted)
  if (actorId === 'sumiwatari' && allyPolluted && plan !== 'clarifying-flow') {
    return false
  }
  if (plan === 'clarifying-flow' && !allyPolluted) return false
  if (
    plan === 'moss-droplet' &&
    Object.values(battle.allies).every((ally) => ally.currentHp >= ally.maxHp)
  ) {
    return false
  }
  return true
}

export function setSumiPracticePlan(
  battle: SumiPracticeBattleState,
  actorId: SumiPracticeAllyId,
  plan: SumiPracticePlan,
): SumiPracticeBattleState {
  if (!canSetSumiPracticePlan(battle, actorId, plan)) return battle
  if (battle.plans[actorId] === plan) return battle
  return { ...battle, plans: { ...battle.plans, [actorId]: plan } }
}

export function canResolveSumiPracticeRound(
  battle: SumiPracticeBattleState,
): boolean {
  return (
    battle.outcome === 'ongoing' &&
    battle.plans.tomoshigoke !== null &&
    battle.plans.numakuguri !== null &&
    battle.plans.sumiwatari !== null
  )
}

export function resolveSumiPracticeRound(
  battle: SumiPracticeBattleState,
): SumiPracticeBattleState {
  if (!canResolveSumiPracticeRound(battle)) return battle

  const allies = {
    tomoshigoke: { ...battle.allies.tomoshigoke },
    numakuguri: { ...battle.allies.numakuguri },
    sumiwatari: { ...battle.allies.sumiwatari },
  }
  let enemyHp = battle.enemyHp
  let clarifyingFlowUsed = battle.clarifyingFlowUsed
  let burrowGuard = false
  const log: string[] = []

  for (const actorId of ['tomoshigoke', 'numakuguri', 'sumiwatari'] as const) {
    const plan = battle.plans[actorId]
    if (!plan) continue
    switch (plan) {
      case 'attack': {
        const damage = attackDamage[actorId]
        enemyHp = Math.max(0, enemyHp - damage)
        allies[actorId].vitality = addVitality(allies[actorId].vitality, 20)
        const name = {
          tomoshigoke: '灯角突き',
          numakuguri: '大尾打ち',
          sumiwatari: '水圧弾',
        }[actorId]
        log.push(`${name}！ キリハネに${damage}ダメージ。`)
        break
      }
      case 'defend':
        allies[actorId].vitality = addVitality(allies[actorId].vitality, 25)
        log.push(`${allyNames[actorId]}は身を守った。`)
        break
      case 'moss-droplet': {
        allies.tomoshigoke.vitality -= 25
        const targetId = (Object.keys(allies) as SumiPracticeAllyId[]).reduce(
          (mostWounded, candidate) =>
            allies[candidate].maxHp - allies[candidate].currentHp >
            allies[mostWounded].maxHp - allies[mostWounded].currentHp
              ? candidate
              : mostWounded,
          'tomoshigoke',
        )
        const before = allies[targetId].currentHp
        allies[targetId].currentHp = Math.min(allies[targetId].maxHp, before + 24)
        log.push(`灯苔の雫。${allyNames[targetId]}のHPが${allies[targetId].currentHp - before}回復。`)
        break
      }
      case 'burrow-guard':
        allies.numakuguri.vitality -= 20
        burrowGuard = true
        log.push('ヌマクグリが身代わり潜行で仲間の前へ出た。')
        break
      case 'clarifying-flow': {
        allies.sumiwatari.vitality -= 25
        const targetId = (Object.keys(allies) as SumiPracticeAllyId[]).find(
          (id) => allies[id].polluted,
        )
        if (targetId) {
          const before = allies[targetId].currentHp
          allies[targetId].polluted = false
          allies[targetId].currentHp = Math.min(allies[targetId].maxHp, before + 8)
          clarifyingFlowUsed = true
          log.push(`澄み流し！ ${allyNames[targetId]}の汚染を解除し、HPが${allies[targetId].currentHp - before}回復。`)
        }
        break
      }
    }
  }

  if (enemyHp === 0) {
    log.push('汚染をまとったキリハネは、湿原の奥へ退いた。')
    return {
      ...battle,
      enemyHp,
      allies,
      clarifyingFlowUsed,
      outcome: 'victory',
      plans: { tomoshigoke: null, numakuguri: null, sumiwatari: null },
      lastLog: log,
    }
  }

  const intendedTarget: SumiPracticeAllyId =
    battle.round % 2 === 1 ? 'sumiwatari' : 'numakuguri'
  const targetId = burrowGuard ? 'numakuguri' : intendedTarget
  let incomingDamage = 14
  if (battle.plans[targetId] === 'defend') incomingDamage = Math.floor(incomingDamage * 0.6)
  if (burrowGuard) incomingDamage = Math.floor(incomingDamage * 0.8)
  allies[targetId].currentHp = Math.max(0, allies[targetId].currentHp - incomingDamage)
  log.push(`キリハネの汚染飛沫。${allyNames[targetId]}は${incomingDamage}ダメージ。`)

  for (const actorId of Object.keys(allies) as SumiPracticeAllyId[]) {
    if (!allies[actorId].polluted) continue
    allies[actorId].currentHp = Math.max(0, allies[actorId].currentHp - 5)
    log.push(`${allyNames[actorId]}は汚染により5ダメージ。`)
  }

  return {
    ...battle,
    round: battle.round + 1,
    enemyHp,
    allies,
    clarifyingFlowUsed,
    plans: { tomoshigoke: null, numakuguri: null, sumiwatari: null },
    lastLog: log,
  }
}
