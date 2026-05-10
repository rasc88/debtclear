import useDebtStore from '../store/useDebtStore'
import { formatCurrency } from '../engine/formatters'
import { LOAN_ID } from '../engine/simulate'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

// ── Shared sub-components ────────────────────────────────────────────────────

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        enabled ? 'bg-indigo-600' : 'bg-gray-200',
      ].join(' ')}
    >
      <span className={[
        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
        enabled ? 'translate-x-5' : 'translate-x-0',
      ].join(' ')} />
    </button>
  )
}

function LoanField({ label, value, onChange, prefix, suffix, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min="0"
          step="0.01"
          className={[
            'w-full border border-gray-200 rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
            prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-7' : 'px-3',
          ].join(' ')}
        />
        {suffix && <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SimulationPanel({ debts }) {
  const monthlyBudget    = useDebtStore((s) => s.monthlyBudget)
  const setMonthlyBudget = useDebtStore((s) => s.setMonthlyBudget)
  const attackOrder      = useDebtStore((s) => s.attackOrder)
  const setAttackOrder   = useDebtStore((s) => s.setAttackOrder)
  const loan             = useDebtStore((s) => s.loanConfig)
  const updateLoan       = useDebtStore((s) => s.updateLoan)

  // ── Loan logic ──────────────────────────────────────────────────────────────

  const loanAmount     = parseFloat(loan.amount) || 0
  const targets        = loan.targets ?? []
  const totalAllocated = targets.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const remaining      = loanAmount - totalAllocated
  const isOverAllocated = totalAllocated > loanAmount + 0.01

  const getTarget = (debtId) => targets.find((t) => t.debtId === debtId)

  const toggleDebt = (debtId) => {
    if (getTarget(debtId)) {
      updateLoan({ targets: targets.filter((t) => t.debtId !== debtId) })
    } else {
      const bal = parseFloat(debts.find((d) => d.id === debtId)?.balance) || 0
      updateLoan({ targets: [...targets, { debtId, amount: Math.min(bal, Math.max(0, remaining)).toFixed(2) }] })
    }
  }

  const setTargetAmount = (debtId, value) =>
    updateLoan({ targets: targets.map((t) => t.debtId === debtId ? { ...t, amount: value } : t) })

  const payOffFully = (debtId) => {
    const bal = parseFloat(debts.find((d) => d.id === debtId)?.balance) || 0
    if (getTarget(debtId)) setTargetAmount(debtId, String(bal))
    else updateLoan({ targets: [...targets, { debtId, amount: String(bal) }] })
  }

  // ── Priority list logic ──────────────────────────────────────────────────────

  const loanPaidIds = new Set(
    loan.enabled
      ? targets
          .filter((t) => {
            const debt = debts.find((d) => d.id === t.debtId)
            return debt && (parseFloat(t.amount) || 0) >= (parseFloat(debt.balance) || 0)
          })
          .map((t) => t.debtId)
      : [],
  )

  const loanPayment  = loan.enabled ? (parseInt(loan.monthlyPayment, 10) || 0) : 0
  const loanInList   = loan.enabled && loanPayment > 0 && loanAmount > 0

  // Priority items: active card debts + loan (if active), in attackOrder order
  const orderedItems = [
    ...attackOrder
      .map((id) => {
        if (id === LOAN_ID) return loanInList ? { kind: 'loan', id: LOAN_ID } : null
        const d = debts.find((x) => x.id === id)
        return d && !loanPaidIds.has(d.id) ? { kind: 'card', id, debt: d } : null
      })
      .filter(Boolean),
    // Append any active card debts not yet in attackOrder
    ...debts
      .filter((d) => !loanPaidIds.has(d.id) && !attackOrder.includes(d.id))
      .map((d) => ({ kind: 'card', id: d.id, debt: d })),
    // Append loan if active but not yet in attackOrder
    ...(loanInList && !attackOrder.includes(LOAN_ID) ? [{ kind: 'loan', id: LOAN_ID }] : []),
  ]

  const budget       = parseFloat(monthlyBudget) || 0
  const sumCardMins  = orderedItems.reduce((s, item) => {
    if (item.kind === 'loan') return s
    return s + (parseFloat(item.debt.minPayment) || 0)
  }, 0)
  // Budget is all-inclusive: covers card minimums + loan minimum + surplus.
  const totalMins      = sumCardMins + loanPayment
  const surplus        = Math.max(0, budget - totalMins)
  const budgetTooLow   = budget > 0 && budget < totalMins
  const minBudgetNeeded = totalMins

  const visibleIds = orderedItems.map((item) => item.id)

  const moveUp = (itemId) => {
    const visIdx = visibleIds.indexOf(itemId)
    if (visIdx <= 0) return
    const swapWithId = visibleIds[visIdx - 1]
    // Ensure both IDs are in attackOrder before swapping
    const base = attackOrder.includes(LOAN_ID) || itemId !== LOAN_ID
      ? [...attackOrder]
      : [...attackOrder, LOAN_ID]
    const i = base.indexOf(itemId)
    const j = base.indexOf(swapWithId)
    if (i === -1 || j === -1) return
    ;[base[i], base[j]] = [base[j], base[i]]
    setAttackOrder(base)
  }

  const moveDown = (itemId) => {
    const visIdx = visibleIds.indexOf(itemId)
    if (visIdx === -1 || visIdx >= visibleIds.length - 1) return
    const swapWithId = visibleIds[visIdx + 1]
    const base = attackOrder.includes(LOAN_ID) || itemId !== LOAN_ID
      ? [...attackOrder]
      : [...attackOrder, LOAN_ID]
    const i = base.indexOf(itemId)
    const j = base.indexOf(swapWithId)
    if (i === -1 || j === -1) return
    ;[base[i], base[j]] = [base[j], base[i]]
    setAttackOrder(base)
  }

  const handleLoanToggle = (v) => {
    updateLoan({ enabled: v })
    if (v && !attackOrder.includes(LOAN_ID)) {
      setAttackOrder([...attackOrder, LOAN_ID])
    } else if (!v) {
      setAttackOrder(attackOrder.filter((id) => id !== LOAN_ID))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4">

      {/* ── Section 1: Payment priority ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Payment Priority</p>
          <p className="text-xs text-gray-400 mt-1">
            Debt #1 gets all surplus. Use ▲▼ to reorder — highest APR first saves the most interest.
          </p>
        </div>

        <div className="space-y-2">
          {orderedItems.map((item, i) => {
            const isTarget  = i === 0
            const isLoan    = item.kind === 'loan'
            const color     = isLoan ? '#6b7280' : COLORS[debts.indexOf(item.debt) % COLORS.length]
            const min       = isLoan ? loanPayment : (parseFloat(item.debt.minPayment) || 0)
            const payment   = isTarget ? min + surplus : min
            const label     = isLoan ? 'Personal Loan' : item.debt.name
            const sub       = isLoan
              ? `${formatCurrency(loanAmount)} · ${loan.annualRate || 0}% APR`
              : `${formatCurrency(parseFloat(item.debt.balance) || 0)} · ${item.debt.annualRate}% APR`

            return (
              <div
                key={item.id}
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-3 border transition-colors',
                  isTarget ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-gray-50',
                ].join(' ')}
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(item.id)}
                    disabled={i === 0}
                    className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveDown(item.id)}
                    disabled={i === orderedItems.length - 1}
                    className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-xs leading-none"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Priority badge */}
                <span
                  className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: color }}
                >
                  {i + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color }}>{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>

                {/* Payment */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">{formatCurrency(payment)}/mo</p>
                  {isTarget && surplus > 0 ? (
                    <p className="text-xs text-indigo-500">+{formatCurrency(surplus)} extra</p>
                  ) : isLoan ? (
                    <p className="text-xs text-gray-400">fixed</p>
                  ) : (
                    <p className="text-xs text-gray-400">minimum</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Editable budget */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-500 shrink-0">Monthly debt budget</label>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  min="0"
                  step="1"
                  className={[
                    'w-28 pl-7 pr-2 py-1.5 border rounded-lg text-sm font-bold text-right focus:outline-none focus:ring-2',
                    budgetTooLow
                      ? 'border-red-400 focus:ring-red-300 text-red-700'
                      : 'border-gray-200 focus:ring-indigo-300 text-gray-800',
                  ].join(' ')}
                />
              </div>
              <span className="text-sm text-gray-400">/mo</span>
            </div>
          </div>
          {budgetTooLow && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-red-500">
                Need at least {formatCurrency(minBudgetNeeded)}/mo to cover all minimums
              </p>
              <button
                type="button"
                onClick={() => setMonthlyBudget(String(Math.ceil(minBudgetNeeded) + 1))}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md whitespace-nowrap"
              >
                Set {formatCurrency(Math.ceil(minBudgetNeeded) + 1)}/mo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Personal loan simulator ── */}
      <div className="border-t border-gray-100">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Personal Loan Simulation</p>
            <p className="text-xs text-gray-400 mt-0.5">Borrow at a lower rate to pay off high-interest debts</p>
          </div>
          <Toggle enabled={loan.enabled} onChange={handleLoanToggle} />
        </div>

        {loan.enabled && (
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LoanField label="Loan amount"               value={loan.amount}         onChange={(v) => updateLoan({ amount: v })}          prefix="$" placeholder="e.g. 5000" />
              <LoanField label="Annual interest rate"      value={loan.annualRate}     onChange={(v) => updateLoan({ annualRate: v })}      suffix="%" placeholder="0 for interest-free" />
              <LoanField label="Minimum monthly payment"   value={loan.monthlyPayment} onChange={(v) => updateLoan({ monthlyPayment: v })}  prefix="$" placeholder="e.g. 200" />
            </div>

            {loanAmount > 0 && (
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Apply loan to debts
                  </p>
                  <div className="space-y-2">
                    {debts.map((debt) => {
                      const target  = getTarget(debt.id)
                      const checked = !!target
                      const balance = parseFloat(debt.balance) || 0
                      return (
                        <div
                          key={debt.id}
                          className={[
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors',
                            checked ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100 bg-gray-50',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDebt(debt.id)}
                            className="accent-indigo-600 w-4 h-4 shrink-0 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{debt.name}</p>
                            <p className="text-xs text-gray-400">{formatCurrency(balance)} · {debt.annualRate}% APR</p>
                          </div>
                          {checked && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                                <input
                                  type="number"
                                  value={target.amount}
                                  min="0"
                                  max={balance}
                                  step="1"
                                  onChange={(e) => setTargetAmount(debt.id, e.target.value)}
                                  className="w-24 pl-5 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                />
                              </div>
                              <button
                                onClick={() => payOffFully(debt.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
                              >
                                Pay off
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className={[
                  'rounded-xl px-4 py-3 flex items-center justify-between text-sm',
                  isOverAllocated ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200',
                ].join(' ')}>
                  <span className={isOverAllocated ? 'text-red-600 font-medium' : 'text-gray-500'}>
                    {isOverAllocated
                      ? `Over-allocated by ${formatCurrency(totalAllocated - loanAmount)}`
                      : `Allocated: ${formatCurrency(totalAllocated)} of ${formatCurrency(loanAmount)}`}
                  </span>
                  {!isOverAllocated && remaining > 0.01 && (
                    <span className="text-gray-400 text-xs">{formatCurrency(remaining)} unallocated</span>
                  )}
                  {!isOverAllocated && remaining <= 0.01 && totalAllocated > 0 && (
                    <span className="text-green-600 text-xs font-medium">Fully allocated ✓</span>
                  )}
                </div>

                {parseFloat(loan.monthlyPayment) > 0 && (
                  <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                    Loan of {formatCurrency(loanAmount)} at {loan.annualRate || 0}% APR ·{' '}
                    minimum {formatCurrency(parseFloat(loan.monthlyPayment))}/mo included in your monthly budget.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
