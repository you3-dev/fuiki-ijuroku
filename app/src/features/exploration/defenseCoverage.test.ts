import { describe, expect, it } from 'vitest'
import {
  areaAttackCoverage,
  setupTurnCoverage,
  singleTargetCoverage,
  waterwayCoverage,
} from './defenseCoverage'

describe('defense coverage feedback', () => {
  it('recognizes defend, protection, and mismatched protection', () => {
    expect(singleTargetCoverage({
      targetName: 'トモシゴケ', targetDefending: true, protectorPlanned: false,
      protectedTargetName: 'トモシゴケ', plansComplete: true,
    }).status).toBe('covered')
    expect(singleTargetCoverage({
      targetName: 'トモシゴケ', targetDefending: false, protectorPlanned: true,
      protectedTargetName: 'トモシゴケ', plansComplete: true,
    }).status).toBe('covered')
    expect(singleTargetCoverage({
      targetName: 'ヌマクグリ', targetDefending: false, protectorPlanned: true,
      protectedTargetName: 'トモシゴケ', plansComplete: true,
    }).status).toBe('mismatch')
  })

  it('distinguishes partial mitigation and incomplete planning', () => {
    expect(singleTargetCoverage({
      targetName: 'ヌマクグリ', targetDefending: false, protectorPlanned: true,
      protectedTargetName: 'トモシゴケ', plansComplete: true,
      mismatchedProtectionMitigates: true,
    }).status).toBe('partial')
    expect(singleTargetCoverage({
      targetName: 'トモシゴケ', targetDefending: false, protectorPlanned: false,
      protectedTargetName: 'トモシゴケ', plansComplete: false,
    }).status).toBe('open')
  })

  it('evaluates area and setup turns', () => {
    expect(areaAttackCoverage(3, 3).status).toBe('covered')
    expect(areaAttackCoverage(1, 3).status).toBe('partial')
    expect(areaAttackCoverage(0, 3).status).toBe('mismatch')
    expect(setupTurnCoverage().status).toBe('not-needed')
  })

  it('requires both attack protection and cleansing in the waterway', () => {
    expect(waterwayCoverage(true, true, true).status).toBe('covered')
    expect(waterwayCoverage(true, false, true).status).toBe('partial')
    expect(waterwayCoverage(false, false, true).status).toBe('mismatch')
    expect(waterwayCoverage(true, false, false).status).toBe('covered')
  })
})
