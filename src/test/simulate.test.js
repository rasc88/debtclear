import { describe, it, expect } from 'vitest'
import { simulate } from '../engine/simulate'

describe('simulate', () => {
  it('returns empty timeline for no debts', () => {
    const result = simulate([])
    expect(result.months).toBe(0)
    expect(result.totalInterest).toBe(0)
  })
})
