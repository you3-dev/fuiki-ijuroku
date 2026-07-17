export type BattleImpactKind = 'damage' | 'heal' | 'cleanse' | 'calm' | 'status'

export type BattleImpact = {
  kind: BattleImpactKind
  label: string
  announcement: string
}

export type BattleRelationCue = {
  kind: 'protect'
  actor: string
  target: string
  announcement: string
}

function numericImpact(
  kind: BattleImpactKind,
  metric: string,
  value: number,
  direction: 'increase' | 'decrease',
): BattleImpact | null {
  if (value <= 0) return null
  const sign = direction === 'increase' ? '＋' : '−'
  return {
    kind,
    label: `${metric} ${sign}${value}`,
    announcement: `${metric}が${value}${direction === 'increase' ? '増加' : '減少'}`,
  }
}

export function extractBattleImpacts(lines: string[]): BattleImpact[] {
  const impacts: BattleImpact[] = []

  for (const line of lines) {
    const heal = line.match(/HPが(\d+)回復/)
    const pollutionValue = line.match(/汚染値が(\d+)低下/)
    const pollutionStages = line.match(/汚染(\d+)段階を除去/)
    const vigilance = line.match(/警戒度が(\d+)(?:下が|低下)/)
    const overloadDecrease = line.match(/過負荷値が(\d+)低下/)
    const overloadIncrease = line.match(/過負荷値が(\d+)上昇/)
    const allyDamage =
      line.match(/は(\d+)(?:の生態被害|ダメージ)/) ??
      line.match(/汚染により(\d+)ダメージ/)
    const enemyDamage = line.match(/に(\d+)ダメージ/)
    const targetDamage = line.match(/へ(\d+)(?:の生態被害|の被害)/)

    const candidates = [
      heal
        ? numericImpact('heal', '味方HP', Number(heal[1]), 'increase')
        : null,
      pollutionValue
        ? numericImpact('cleanse', '汚染', Number(pollutionValue[1]), 'decrease')
        : null,
      pollutionStages
        ? numericImpact('cleanse', '汚染', Number(pollutionStages[1]), 'decrease')
        : null,
      vigilance
        ? numericImpact('calm', '警戒', Number(vigilance[1]), 'decrease')
        : null,
      overloadDecrease
        ? numericImpact('cleanse', '過負荷', Number(overloadDecrease[1]), 'decrease')
        : null,
      overloadIncrease
        ? numericImpact('damage', '過負荷', Number(overloadIncrease[1]), 'increase')
        : null,
      allyDamage
        ? numericImpact('damage', '味方HP', Number(allyDamage[1]), 'decrease')
        : null,
      enemyDamage
        ? numericImpact('damage', '敵HP', Number(enemyDamage[1]), 'decrease')
        : null,
      targetDamage
        ? numericImpact('damage', '対象HP', Number(targetDamage[1]), 'decrease')
        : null,
    ]

    impacts.push(...candidates.filter((impact): impact is BattleImpact => impact !== null))

    if (!pollutionStages && line.includes('汚染を解除')) {
      impacts.push({ kind: 'cleanse', label: '汚染解除', announcement: '汚染を解除' })
    }
  }

  return impacts.slice(0, 4)
}

export function extractBattleRelationCue(lines: string[]): BattleRelationCue | null {
  for (const line of lines) {
    const targetedProtection = line.match(/^(.+?)(?:が|は)(.+?)をかば(?:います|う|った)/)
    if (targetedProtection) {
      const [, actor, target] = targetedProtection
      return {
        kind: 'protect',
        actor,
        target,
        announcement: `${actor}が${target}をかばう`,
      }
    }

    const burrowGuard = line.match(/^(.+?)が身代わり潜行で仲間の前へ出た/)
    if (burrowGuard) {
      const actor = burrowGuard[1]
      return {
        kind: 'protect',
        actor,
        target: '仲間',
        announcement: `${actor}が仲間をかばう`,
      }
    }
  }

  return null
}
