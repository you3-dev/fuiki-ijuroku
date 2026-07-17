export type EnemyIntentTone = 'single' | 'all' | 'setup'

export type EnemyIntent = {
  action: string
  target: string
  detail: string
  tone: EnemyIntentTone
}

export function introEnemyIntent(round: number): EnemyIntent {
  return {
    action: '翅刃',
    target: round % 2 === 1 ? 'トモシゴケ' : 'ヌマクグリ',
    detail: '単体攻撃',
    tone: 'single',
  }
}

export function practiceEnemyIntent(round: number): EnemyIntent {
  return {
    action: '汚染飛沫',
    target: round % 2 === 1 ? 'スミワタリ' : 'ヌマクグリ',
    detail: '単体攻撃',
    tone: 'single',
  }
}

export function towerEnemyIntent(round: number, mistTurns: number): EnemyIntent {
  if (mistTurns === 0) {
    return {
      action: '霧包み',
      target: '攻撃なし',
      detail: '霧を張り直す',
      tone: 'setup',
    }
  }
  if (round % 2 === 1) {
    return {
      action: '霧裂き',
      target: '前衛全体',
      detail: '全体攻撃',
      tone: 'all',
    }
  }
  return {
    action: '翅刃',
    target: 'トモシゴケ',
    detail: '単体攻撃',
    tone: 'single',
  }
}

export function waterwayEnemyIntent(pollutionSpreading: boolean): EnemyIntent {
  if (pollutionSpreading) {
    return {
      action: '濁流弾＋黒い沈殿',
      target: 'トモシゴケ／前衛全体',
      detail: '単体攻撃＋全体汚染',
      tone: 'all',
    }
  }
  return {
    action: '濁流弾',
    target: 'トモシゴケ',
    detail: '単体攻撃',
    tone: 'single',
  }
}
