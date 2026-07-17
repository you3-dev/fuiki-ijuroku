import { describe, expect, it } from 'vitest'
import { extractBattleImpacts, extractBattleRelationCue } from './battleImpact'

describe('battle impact feedback', () => {
  it('extracts damage and healing from normal battle logs', () => {
    expect(extractBattleImpacts([
      '灯苔の雫。トモシゴケのHPが24回復。',
      'キリハネの翅刃。ヌマクグリは9ダメージ。',
    ])).toMatchObject([
      { kind: 'heal', label: '味方HP ＋24' },
      { kind: 'damage', label: '味方HP −9' },
    ])
  })

  it('distinguishes damage dealt from damage received', () => {
    expect(extractBattleImpacts([
      '灯角突き！ キリハネに14ダメージ。',
      'キリハネの翅刃。トモシゴケは18ダメージ。',
    ])).toMatchObject([
      { kind: 'damage', label: '敵HP −14' },
      { kind: 'damage', label: '味方HP −18' },
    ])
  })

  it('extracts cleansing and calming changes', () => {
    expect(extractBattleImpacts([
      'スミワタリの「澄み流し」。汚染塊の汚染値が60低下。',
      'トモシゴケの「静かな明滅」。警戒度が20下がりました。',
    ])).toMatchObject([
      { kind: 'cleanse', label: '汚染 −60' },
      { kind: 'calm', label: '警戒 −20' },
    ])
  })

  it('does not display zero-value recovery', () => {
    expect(extractBattleImpacts([
      '澄み流し！ トモシゴケの汚染を解除し、HPが0回復。',
    ])).toEqual([
      { kind: 'cleanse', label: '汚染解除', announcement: '汚染を解除' },
    ])
  })

  it('extracts a named protection relationship', () => {
    expect(extractBattleRelationCue([
      'ヌマクグリがトモシゴケをかばいます。',
    ])).toEqual({
      kind: 'protect',
      actor: 'ヌマクグリ',
      target: 'トモシゴケ',
      announcement: 'ヌマクグリがトモシゴケをかばう',
    })
  })

  it('shows the tutorial guard as protecting the party', () => {
    expect(extractBattleRelationCue([
      'ヌマクグリが身代わり潜行で仲間の前へ出た。',
    ])).toMatchObject({
      actor: 'ヌマクグリ',
      target: '仲間',
    })
  })
})
