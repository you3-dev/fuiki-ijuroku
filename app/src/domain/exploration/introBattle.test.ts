import { describe, expect, it } from 'vitest'
import { createIntroBattleState } from './createInitialExpedition'
import {
  canResolveIntroBattleRound,
  canSetIntroBattlePlan,
  resolveIntroBattleRound,
  setIntroBattlePlan,
} from './introBattle'

describe('intro normal battle', () => {
  it('requires one reusable command from each ally before resolving', () => {
    let battle = createIntroBattleState()
    expect(canResolveIntroBattleRound(battle)).toBe(false)

    battle = setIntroBattlePlan(battle, 'tomoshigoke', 'attack')
    battle = setIntroBattlePlan(battle, 'numakuguri', 'defend')
    expect(canResolveIntroBattleRound(battle)).toBe(true)

    const resolved = resolveIntroBattleRound(battle)
    expect(resolved).toMatchObject({ round: 2, enemyHp: 48, outcome: 'ongoing' })
    expect(resolved.allies.tomoshigoke.currentHp).toBe(54)
    expect(resolved.allies.numakuguri.vitality).toBe(65)
  })

  it('uses skills only for their owner and when vitality and targets allow it', () => {
    const initial = createIntroBattleState()
    expect(canSetIntroBattlePlan(initial, 'numakuguri', 'moss-droplet')).toBe(false)
    expect(canSetIntroBattlePlan(initial, 'tomoshigoke', 'moss-droplet')).toBe(false)

    const wounded = {
      ...initial,
      allies: {
        ...initial.allies,
        tomoshigoke: { ...initial.allies.tomoshigoke, currentHp: 40 },
      },
    }
    expect(canSetIntroBattlePlan(wounded, 'tomoshigoke', 'moss-droplet')).toBe(true)
  })

  it('wins by reducing HP to zero and describes retreat rather than death', () => {
    let battle = { ...createIntroBattleState(), enemyHp: 20 }
    battle = setIntroBattlePlan(battle, 'tomoshigoke', 'attack')
    battle = setIntroBattlePlan(battle, 'numakuguri', 'attack')
    const resolved = resolveIntroBattleRound(battle)

    expect(resolved.outcome).toBe('victory')
    expect(resolved.enemyHp).toBe(0)
    expect(resolved.lastLog.at(-1)).toContain('霧の奥へ退いた')
  })
})
