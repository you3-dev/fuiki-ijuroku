export type DefenseCoverageStatus = 'covered' | 'partial' | 'mismatch' | 'open' | 'not-needed'

export type DefenseCoverage = {
  status: DefenseCoverageStatus
  label: string
  detail: string
}

export function singleTargetCoverage({
  targetName,
  targetDefending,
  protectorPlanned,
  protectedTargetName,
  plansComplete,
  mismatchedProtectionMitigates = false,
}: {
  targetName: string
  targetDefending: boolean
  protectorPlanned: boolean
  protectedTargetName: string
  plansComplete: boolean
  mismatchedProtectionMitigates?: boolean
}): DefenseCoverage {
  if (targetDefending) {
    return { status: 'covered', label: '対応できています', detail: `${targetName}が防御` }
  }
  if (protectorPlanned && protectedTargetName === targetName) {
    return { status: 'covered', label: '対応できています', detail: `ヌマクグリが${targetName}をかばう` }
  }
  if (protectorPlanned && mismatchedProtectionMitigates) {
    return {
      status: 'partial',
      label: '軽減のみ',
      detail: `標的は${targetName}・身代わり潜行で少し軽減`,
    }
  }
  if (protectorPlanned) {
    return {
      status: 'mismatch',
      label: '対象が違います',
      detail: `${protectedTargetName}を守る予定・敵は${targetName}狙い`,
    }
  }
  if (!plansComplete) {
    return { status: 'open', label: '対応を選択中', detail: `${targetName}の行動を確認` }
  }
  return { status: 'mismatch', label: '未対応', detail: `${targetName}は防御していません` }
}

export function areaAttackCoverage(defending: number, activeAllies: number): DefenseCoverage {
  if (activeAllies === 0 || defending >= activeAllies) {
    return { status: 'covered', label: '対応できています', detail: '前衛全体が防御' }
  }
  if (defending > 0) {
    return {
      status: 'partial',
      label: '一部だけ対応',
      detail: `${defending}/${activeAllies}体が防御`,
    }
  }
  return { status: 'mismatch', label: '未対応', detail: '全体攻撃・防御する前衛なし' }
}

export function setupTurnCoverage(): DefenseCoverage {
  return { status: 'not-needed', label: '防御は不要', detail: 'このラウンドは攻撃なし' }
}

export function waterwayCoverage(
  attackCovered: boolean,
  pollutionCovered: boolean,
  pollutionSpreading: boolean,
): DefenseCoverage {
  if (!pollutionSpreading) {
    return attackCovered
      ? { status: 'covered', label: '対応できています', detail: '濁流弾を防御・かばう' }
      : { status: 'mismatch', label: '未対応', detail: 'トモシゴケへの濁流弾' }
  }
  if (attackCovered && pollutionCovered) {
    return { status: 'covered', label: '対応できています', detail: '濁流弾を軽減・汚染塊を浄化' }
  }
  if (attackCovered) {
    return { status: 'partial', label: '一部だけ対応', detail: '攻撃は軽減・全体汚染が残る' }
  }
  if (pollutionCovered) {
    return { status: 'partial', label: '一部だけ対応', detail: '汚染は止まる・濁流弾が残る' }
  }
  return { status: 'mismatch', label: '未対応', detail: '単体攻撃と全体汚染が残る' }
}
