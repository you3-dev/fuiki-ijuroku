import { describe, expect, it } from 'vitest'
import {
  introEnemyIntent,
  practiceEnemyIntent,
  towerEnemyIntent,
  waterwayEnemyIntent,
} from './enemyIntent'

describe('enemy intent presentation', () => {
  it('alternates normal battle targets by round', () => {
    expect(introEnemyIntent(1).target).toBe('トモシゴケ')
    expect(introEnemyIntent(2).target).toBe('ヌマクグリ')
    expect(practiceEnemyIntent(1).target).toBe('スミワタリ')
    expect(practiceEnemyIntent(2).target).toBe('ヌマクグリ')
  })

  it('distinguishes tower area, single, and setup turns', () => {
    expect(towerEnemyIntent(1, 2)).toMatchObject({ target: '前衛全体', tone: 'all' })
    expect(towerEnemyIntent(2, 1)).toMatchObject({ target: 'トモシゴケ', tone: 'single' })
    expect(towerEnemyIntent(3, 0)).toMatchObject({ target: '攻撃なし', tone: 'setup' })
  })

  it('adds party-wide pollution while the waterway mass remains', () => {
    expect(waterwayEnemyIntent(true)).toMatchObject({
      target: 'トモシゴケ／前衛全体',
      detail: '単体攻撃＋全体汚染',
    })
    expect(waterwayEnemyIntent(false)).toMatchObject({
      target: 'トモシゴケ',
      detail: '単体攻撃',
    })
  })
})
