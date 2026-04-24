import { describe, it, expect } from 'vitest'
import { simulate, LOAN_ID } from '../engine/simulate'

const debt = (overrides) => ({
  id: 'd1',
  name: 'Visa',
  balance: '1000',
  annualRate: '12',
  minPayment: '25',
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
    // $1000 at 0%, $200/mo budget → 5 months
    const r = simulate([debt({ annualRate: '0', minPayment: '0' })], ['d1'], null, 200)
    expect(r.totalMonths).toBe(5)
    expect(r.totalInterest).toBeCloseTo(0, 1)
    expect(r.debtPayoffMonths['d1']).toBe(5)
  })

  it('accrues interest on a non-zero rate debt', () => {
    const r = simulate([debt()], ['d1'], null, 200)
    expect(r.totalInterest).toBeGreaterThan(0)
    expect(r.debtPayoffMonths['d1']).toBeGreaterThan(0)
  })

  it('reaches $0 balance after payoff month', () => {
    const r = simulate([debt()], ['d1'], null, 200)
    const payoffMonth = r.debtPayoffMonths['d1']
    expect(r.timeline[payoffMonth - 1].balances['d1']).toBe(0)
  })
})

describe('simulate — avalanche rollover', () => {
  it('rolls surplus to second debt after first is paid off', () => {
    const d1 = debt({ id: 'd1', balance: '500', annualRate: '0', minPayment: '0' })
    const d2 = debt({ id: 'd2', balance: '1000', annualRate: '0', minPayment: '0' })
    // $400/mo total budget. d1 ($500) attacked first → paid in 3 months.
    // After d1 gone, full $400 goes to d2 ($1000) → done in ~3 more months.
    const r = simulate([d1, d2], ['d1', 'd2'], null, 400)
    expect(r.debtPayoffMonths['d1']).toBeLessThan(r.debtPayoffMonths['d2'])
    expect(r.totalMonths).toBeLessThanOrEqual(8)
  })
})

describe('simulate — personal loan', () => {
  it('applies lump sum to target debt at month 0', () => {
    // $1000 debt, loan pays $500 → $500 remaining, $200/mo budget → 3 months
    const d = debt({ balance: '1000', annualRate: '0', minPayment: '0' })
    const loan = { enabled: true, amount: '500', annualRate: '0', monthlyPayment: '0', targets: [{ debtId: 'd1', amount: '500' }] }
    const r = simulate([d], ['d1'], loan, 200)
    expect(r.totalMonths).toBe(3)
  })

  it('marks debt as paid at month 0 when lump sum covers full balance', () => {
    const d = debt({ balance: '1000', annualRate: '0', minPayment: '0' })
    const loan = { enabled: true, amount: '1000', annualRate: '0', monthlyPayment: '0', targets: [{ debtId: 'd1', amount: '1000' }] }
    const r = simulate([d], ['d1'], loan, 200)
    expect(r.debtPayoffMonths['d1']).toBe(0)
  })

  it('surplus rolls into loan after cards are paid', () => {
    // Card: $500, 0%, min=$0. Loan: $1000, 0%, $100/mo. Budget: $200 for card.
    // totalBudget = $200 + $100 = $300. Loan min = $100.
    // Surplus = $300 - $0 - $100 = $200 → card (attacked first).
    // Card paid at month 3 (500 / 200 = 2.5 → ceil = 3).
    // After card, full $300 goes to loan. Loan had $700 left → paid at month 6.
    const d = debt({ balance: '500', annualRate: '0', minPayment: '0' })
    const loan = { enabled: true, amount: '1000', annualRate: '0', monthlyPayment: '100', targets: [] }
    const r = simulate([d], ['d1'], loan, 200)
    expect(r.debtPayoffMonths['d1']).toBe(3)
    expect(r.debtPayoffMonths[LOAN_ID]).toBe(6)
    expect(r.totalMonths).toBe(6)
  })

  it('monthly budget funds the loan when card is fully paid by lump sum', () => {
    // Card ($500) paid at month 0 by lump sum. Budget: $50/mo. Loan: $500, $50/mo.
    // totalBudget = $50 + $50 = $100/mo. Loan: min=$50 + surplus=$50 = $100/mo.
    // Loan paid in 5 months (500 / 100 = 5).
    const d = debt({ balance: '500', annualRate: '0', minPayment: '50' })
    const loan = {
      enabled: true, amount: '500', annualRate: '0', monthlyPayment: '50',
      targets: [{ debtId: 'd1', amount: '500' }],
    }
    const r = simulate([d], ['d1'], loan, 50)
    expect(r.debtPayoffMonths['d1']).toBe(0)
    expect(r.debtPayoffMonths[LOAN_ID]).toBe(5)
    expect(r.totalMonths).toBe(5)
  })

  it('applies lump sum to multiple debts', () => {
    const d1 = debt({ id: 'd1', balance: '500', annualRate: '0', minPayment: '0' })
    const d2 = debt({ id: 'd2', balance: '500', annualRate: '0', minPayment: '0' })
    const loan = {
      enabled: true, amount: '1000', annualRate: '0', monthlyPayment: '0',
      targets: [{ debtId: 'd1', amount: '500' }, { debtId: 'd2', amount: '500' }],
    }
    const r = simulate([d1, d2], ['d1', 'd2'], loan, 200)
    expect(r.debtPayoffMonths['d1']).toBe(0)
    expect(r.debtPayoffMonths['d2']).toBe(0)
  })
})
