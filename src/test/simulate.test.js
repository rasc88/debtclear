import { describe, it, expect } from 'vitest'
import { simulate, LOAN_ID } from '../engine/simulate'

const debt = (overrides) => ({
  id: 'd1',
  name: 'Visa',
  balance: '1000',
  annualRate: '12',
  minPayment: '25',
  monthlyPayment: '200',
  type: 'credit_card',
  ...overrides,
})

describe('simulate — basic', () => {
  it('returns zeros for empty debts', () => {
    const r = simulate([])
    expect(r.totalMonths).toBe(0)
    expect(r.totalInterest).toBe(0)
    expect(r.timeline).toHaveLength(0)
  })

  it('pays off a single 0% debt in exact months', () => {
    // $1000 at 0%, paying $200/mo → 5 months
    const r = simulate([debt({ annualRate: '0', minPayment: '0' })], ['d1'])
    expect(r.totalMonths).toBe(5)
    expect(r.totalInterest).toBeCloseTo(0, 1)
    expect(r.debtPayoffMonths['d1']).toBe(5)
  })

  it('accrues interest on a non-zero rate debt', () => {
    const r = simulate([debt()], ['d1'])
    expect(r.totalInterest).toBeGreaterThan(0)
    expect(r.debtPayoffMonths['d1']).toBeGreaterThan(0)
  })

  it('reaches $0 balance after payoff month', () => {
    const r = simulate([debt()], ['d1'])
    const payoffMonth = r.debtPayoffMonths['d1']
    expect(r.timeline[payoffMonth - 1].balances['d1']).toBe(0)
  })
})

describe('simulate — avalanche rollover', () => {
  it('rolls surplus to second debt after first is paid off', () => {
    const d1 = debt({ id: 'd1', balance: '500', annualRate: '0', minPayment: '0', monthlyPayment: '200' })
    const d2 = debt({ id: 'd2', balance: '1000', annualRate: '0', minPayment: '0', monthlyPayment: '200' })
    // Total budget = $400/mo. d1 paid off in 3 months (500/200 rounds up → month 3)
    // After d1 paid off all $400 goes to d2
    const r = simulate([d1, d2], ['d1', 'd2'])
    expect(r.debtPayoffMonths['d1']).toBeLessThan(r.debtPayoffMonths['d2'])
    // d2 receives $400 after d1 is gone → finishes faster than if only $200
    expect(r.totalMonths).toBeLessThanOrEqual(8)
  })
})

describe('simulate — personal loan', () => {
  it('applies lump sum to target debt at month 0', () => {
    const d = debt({ balance: '1000', annualRate: '0', minPayment: '0', monthlyPayment: '200' })
    const loan = { enabled: true, amount: '500', annualRate: '0', monthlyPayment: '0', targets: [{ debtId: 'd1', amount: '500' }] }
    const r = simulate([d], ['d1'], loan)
    // Balance starts at $500 after lump sum, $200/mo → 3 months (not 5)
    expect(r.totalMonths).toBe(3)
  })

  it('marks debt as paid at month 0 when lump sum covers full balance', () => {
    const d = debt({ balance: '1000', annualRate: '0', minPayment: '0', monthlyPayment: '200' })
    const loan = { enabled: true, amount: '1000', annualRate: '0', monthlyPayment: '0', targets: [{ debtId: 'd1', amount: '1000' }] }
    const r = simulate([d], ['d1'], loan)
    expect(r.debtPayoffMonths['d1']).toBe(0)
  })

  it('surplus rolls into loan after cards are paid', () => {
    // Card: $500, 0%, $200/mo. Loan: $1000, 0%, $100/mo. No targets (no debt paid at month 0).
    // Budget = $200 (card) + $100 (loan) = $300/mo.
    // Card attacked first (higher 0% = same, but it's the priority). Card min=$0, loan min=$100.
    // Available surplus = 300 - 0 - 100 = $200 → goes to card.
    // Card gets $200/mo: paid off in 3 months (500/200 = 2.5 → month 3).
    // After card, full $300 → loan. Loan had $700 left → paid in ~3 more months.
    const d = debt({ balance: '500', annualRate: '0', minPayment: '0', monthlyPayment: '200' })
    const loan = { enabled: true, amount: '1000', annualRate: '0', monthlyPayment: '100', targets: [] }
    const r = simulate([d], ['d1'], loan)
    expect(r.debtPayoffMonths['d1']).toBe(3)
    expect(r.debtPayoffMonths[LOAN_ID]).toBe(6)
    expect(r.totalMonths).toBe(6)
  })

  it('budget does not double-count debts paid by lump sum at month 0', () => {
    // Card paid off at month 0 by loan → its $200/mo slot now belongs to loan, not surplus.
    // Budget = $0 (card gone) + $100 (loan) = $100/mo.
    // Loan: $500, 0%, $100/mo → 5 months.
    const d = debt({ balance: '500', annualRate: '0', minPayment: '0', monthlyPayment: '200' })
    const loan = {
      enabled: true, amount: '500', annualRate: '0', monthlyPayment: '100',
      targets: [{ debtId: 'd1', amount: '500' }],
    }
    const r = simulate([d], ['d1'], loan)
    expect(r.debtPayoffMonths['d1']).toBe(0) // paid at month 0
    expect(r.debtPayoffMonths[LOAN_ID]).toBe(5) // $500 / $100 = 5 months
    expect(r.totalMonths).toBe(5)
  })

  it('applies lump sum to multiple debts', () => {
    const d1 = debt({ id: 'd1', balance: '500', annualRate: '0', minPayment: '0', monthlyPayment: '100' })
    const d2 = debt({ id: 'd2', balance: '500', annualRate: '0', minPayment: '0', monthlyPayment: '100' })
    const loan = {
      enabled: true, amount: '1000', annualRate: '0', monthlyPayment: '0',
      targets: [{ debtId: 'd1', amount: '500' }, { debtId: 'd2', amount: '500' }],
    }
    const r = simulate([d1, d2], ['d1', 'd2'], loan)
    expect(r.debtPayoffMonths['d1']).toBe(0)
    expect(r.debtPayoffMonths['d2']).toBe(0)
  })
})
