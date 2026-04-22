export const LOAN_ID = '__loan__'

/**
 * Avalanche simulation engine — pure JS, zero side effects.
 *
 * When a personal loan is active it is treated as just another debt:
 *  - Its proceeds reduce targeted card balances at month 0.
 *  - It enters the attack order sorted by its APR vs card APRs.
 *  - Its committed monthly payment counts toward the total budget.
 *  - Surplus rolls into it exactly like any other debt in the order.
 *  - totalMonths = when every card AND the loan are fully paid.
 *
 * loanConfig: { enabled, amount, annualRate, monthlyPayment,
 *               targets: [{ debtId, amount }] }
 */
export function simulate(debts, attackOrder = [], loanConfig = null) {
  if (!debts || debts.length === 0) {
    return { timeline: [], debtPayoffMonths: {}, totalInterest: 0, totalMonths: 0 }
  }

  const toNum = (v) => parseFloat(v) || 0

  const balances = {}
  const paidOff = {}
  const debtPayoffMonths = {}

  for (const d of debts) {
    balances[d.id] = toNum(d.balance)
    paidOff[d.id] = balances[d.id] <= 0
    if (paidOff[d.id]) debtPayoffMonths[d.id] = 0
  }

  const loanAmount = toNum(loanConfig?.amount)
  const loanActive = loanConfig?.enabled && loanAmount > 0

  // Month 0 — distribute loan proceeds to targeted debts
  if (loanActive) {
    for (const t of (loanConfig.targets ?? [])) {
      if (!Object.prototype.hasOwnProperty.call(balances, t.debtId)) continue
      const amt = Math.min(toNum(t.amount), balances[t.debtId])
      balances[t.debtId] = Math.max(0, balances[t.debtId] - amt)
      if (balances[t.debtId] < 0.005 && !paidOff[t.debtId]) {
        balances[t.debtId] = 0
        paidOff[t.debtId] = true
        debtPayoffMonths[t.debtId] = 0
      }
    }
  }

  // Build unified debt list — loan is another debt in the system
  const loanMonthlyPayment = loanActive ? toNum(loanConfig.monthlyPayment) : 0
  const loanAnnualRate = loanActive ? toNum(loanConfig.annualRate) : 0
  const loanIsDebt = loanActive && loanMonthlyPayment > 0

  if (loanIsDebt) {
    balances[LOAN_ID] = loanAmount
    paidOff[LOAN_ID] = loanAmount <= 0.005
    if (paidOff[LOAN_ID]) debtPayoffMonths[LOAN_ID] = 0
  }

  // Resolve card attack order, then insert loan by APR (lower rate = lower priority)
  const knownCardIds = debts.map((d) => d.id)
  const orderedIds = [
    ...attackOrder.filter((id) => knownCardIds.includes(id)),
    ...knownCardIds.filter((id) => !attackOrder.includes(id)),
  ]

  if (loanIsDebt && !paidOff[LOAN_ID]) {
    const insertAt = orderedIds.findIndex((id) => {
      const d = debts.find((x) => x.id === id)
      return d && toNum(d.annualRate) < loanAnnualRate
    })
    if (insertAt === -1) orderedIds.push(LOAN_ID)
    else orderedIds.splice(insertAt, 0, LOAN_ID)
  }

  // Total budget = payments for cards still active + loan payment.
  // Debts paid off at month 0 by the lump sum are excluded — their payment slot
  // is now occupied by the loan payment, not freed as surplus.
  const cardBudget = debts.reduce((s, d) => paidOff[d.id] ? s : s + toNum(d.monthlyPayment), 0)
  const totalBudget = cardBudget + (loanIsDebt ? loanMonthlyPayment : 0)

  const getMinPayment = (id) => {
    if (id === LOAN_ID) return loanMonthlyPayment
    return toNum(debts.find((d) => d.id === id)?.minPayment)
  }

  const getRate = (id) => {
    if (id === LOAN_ID) return loanAnnualRate / 100 / 12
    return toNum(debts.find((d) => d.id === id)?.annualRate) / 100 / 12
  }

  const allIds = [...knownCardIds, ...(loanIsDebt ? [LOAN_ID] : [])]

  const timeline = []
  let totalInterest = 0
  const MAX_MONTHS = 600

  for (let month = 1; month <= MAX_MONTHS; month++) {
    // 1. Apply monthly interest to all active debts (cards + loan)
    for (const id of allIds) {
      if (paidOff[id]) continue
      const rate = getRate(id)
      const interest = balances[id] * rate
      balances[id] += interest
      totalInterest += interest
    }

    // 2. Pay minimums on all active debts
    let available = totalBudget
    for (const id of allIds) {
      if (paidOff[id]) continue
      const pay = Math.min(getMinPayment(id), balances[id])
      balances[id] = Math.max(0, balances[id] - pay)
      available -= pay
      if (balances[id] < 0.005) {
        balances[id] = 0
        paidOff[id] = true
        debtPayoffMonths[id] = month
      }
    }

    // 3. Apply surplus to the highest-priority unpaid debt (avalanche)
    if (available > 0.005) {
      const priorityId = orderedIds.find((id) => !paidOff[id])
      if (priorityId) {
        const pay = Math.min(available, balances[priorityId])
        balances[priorityId] = Math.max(0, balances[priorityId] - pay)
        if (balances[priorityId] < 0.005) {
          balances[priorityId] = 0
          paidOff[priorityId] = true
          debtPayoffMonths[priorityId] = month
        }
      }
    }

    // 4. Snapshot (include loan balance when active)
    const snap = { month, balances: { ...balances } }
    timeline.push(snap)

    // 5. Done when everything is paid
    if (Object.values(paidOff).every(Boolean)) {
      return { timeline, debtPayoffMonths, totalInterest, totalMonths: month }
    }
  }

  return { timeline, debtPayoffMonths, totalInterest, totalMonths: MAX_MONTHS }
}
