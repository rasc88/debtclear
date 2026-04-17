/**
 * Avalanche simulation engine — pure JS, zero side effects.
 *
 * Strategy:
 *  - Pay minimum to every active debt each month.
 *  - Apply all remaining budget (surplus) to the current priority debt.
 *  - When a debt reaches $0 its full monthly payment rolls into the surplus
 *    for the next debt in the attack order.
 *  - If a personal loan is active its lump-sum is applied at month 0 and its
 *    monthly payment is subtracted from the available budget each month.
 *
 * @param {Object[]} debts        Debt objects from the store
 * @param {string[]} attackOrder  Debt IDs ordered by attack priority (index 0 = first)
 * @param {Object|null} loanConfig  { amount, annualRate, monthlyPayment, targetDebtId }
 * @returns {{
 *   timeline: { month: number, balances: Object }[],
 *   debtPayoffMonths: Object,   // debtId → month paid off (0 = paid at start by lump sum)
 *   totalInterest: number,
 *   totalMonths: number,
 * }}
 */
export function simulate(debts, attackOrder = [], loanConfig = null) {
  if (!debts || debts.length === 0) {
    return { timeline: [], debtPayoffMonths: {}, totalInterest: 0, totalMonths: 0 }
  }

  const toNum = (v) => parseFloat(v) || 0

  // Working balances (mutable clone)
  const balances = {}
  const paidOff = {}
  const debtPayoffMonths = {}

  for (const d of debts) {
    balances[d.id] = toNum(d.balance)
    paidOff[d.id] = balances[d.id] <= 0
    if (paidOff[d.id]) debtPayoffMonths[d.id] = 0
  }

  // Apply loan lump-sum at month 0
  if (loanConfig?.targetDebtId && toNum(loanConfig.amount) > 0) {
    const tid = loanConfig.targetDebtId
    balances[tid] = Math.max(0, balances[tid] - toNum(loanConfig.amount))
    if (balances[tid] === 0 && !paidOff[tid]) {
      paidOff[tid] = true
      debtPayoffMonths[tid] = 0
    }
  }

  const totalBudget = debts.reduce((s, d) => s + toNum(d.monthlyPayment), 0)
  const loanPayment = loanConfig ? toNum(loanConfig.monthlyPayment) : 0

  // Resolve attack order — filter to IDs that exist, then append any missing ones
  const knownIds = debts.map((d) => d.id)
  const orderedIds = [
    ...attackOrder.filter((id) => knownIds.includes(id)),
    ...knownIds.filter((id) => !attackOrder.includes(id)),
  ]

  const timeline = []
  let totalInterest = 0
  const MAX_MONTHS = 600

  for (let month = 1; month <= MAX_MONTHS; month++) {
    // 1. Apply monthly interest
    for (const d of debts) {
      if (paidOff[d.id]) continue
      const rate = toNum(d.annualRate) / 100 / 12
      const interest = balances[d.id] * rate
      balances[d.id] += interest
      totalInterest += interest
    }

    // 2. Pay minimum to every active debt
    let available = totalBudget - loanPayment
    for (const d of debts) {
      if (paidOff[d.id]) continue
      const pay = Math.min(toNum(d.minPayment), balances[d.id])
      balances[d.id] = Math.max(0, balances[d.id] - pay)
      available -= pay
      if (balances[d.id] < 0.005) {
        balances[d.id] = 0
        paidOff[d.id] = true
        debtPayoffMonths[d.id] = month
      }
    }

    // 3. Apply surplus to current priority debt
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

    // 4. Snapshot
    timeline.push({ month, balances: { ...balances } })

    // 5. Done when all paid off
    if (Object.values(paidOff).every(Boolean)) {
      return { timeline, debtPayoffMonths, totalInterest, totalMonths: month }
    }
  }

  return { timeline, debtPayoffMonths, totalInterest, totalMonths: MAX_MONTHS }
}
