import useDebtStore from '../store/useDebtStore'
import { formatCurrency } from '../engine/formatters'

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
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200',
          enabled ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function Field({ label, value, onChange, prefix, suffix, placeholder }) {
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

export default function LoanModule() {
  const debts = useDebtStore((s) => s.debts)
  const loan = useDebtStore((s) => s.loanConfig)
  const updateLoan = useDebtStore((s) => s.updateLoan)

  const loanAmount = parseFloat(loan.amount) || 0
  const targets = loan.targets ?? []
  const totalAllocated = targets.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const remaining = loanAmount - totalAllocated

  const getTarget = (debtId) => targets.find((t) => t.debtId === debtId)

  const toggleDebt = (debtId) => {
    if (getTarget(debtId)) {
      updateLoan({ targets: targets.filter((t) => t.debtId !== debtId) })
    } else {
      const debtBalance = parseFloat(debts.find((d) => d.id === debtId)?.balance) || 0
      const suggestedAmount = Math.min(debtBalance, Math.max(0, remaining)).toFixed(2)
      updateLoan({ targets: [...targets, { debtId, amount: suggestedAmount }] })
    }
  }

  const setTargetAmount = (debtId, value) => {
    updateLoan({
      targets: targets.map((t) => t.debtId === debtId ? { ...t, amount: value } : t),
    })
  }

  const payOffFully = (debtId) => {
    const debtBalance = parseFloat(debts.find((d) => d.id === debtId)?.balance) || 0
    if (getTarget(debtId)) {
      setTargetAmount(debtId, String(debtBalance))
    } else {
      updateLoan({ targets: [...targets, { debtId, amount: String(debtBalance) }] })
    }
  }

  const isOverAllocated = totalAllocated > loanAmount + 0.01

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4">
      {/* Header / toggle */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-gray-800 text-sm">Personal Loan Simulation</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Borrow at a lower rate to pay off high-interest debts
          </p>
        </div>
        <Toggle enabled={loan.enabled} onChange={(v) => updateLoan({ enabled: v })} />
      </div>

      {loan.enabled && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* Loan terms */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field
              label="Loan amount"
              value={loan.amount}
              onChange={(v) => updateLoan({ amount: v })}
              prefix="$"
              placeholder="e.g. 5000"
            />
            <Field
              label="Annual interest rate"
              value={loan.annualRate}
              onChange={(v) => updateLoan({ annualRate: v })}
              suffix="%"
              placeholder="0 for interest-free"
            />
            <Field
              label="Monthly payment to lender"
              value={loan.monthlyPayment}
              onChange={(v) => updateLoan({ monthlyPayment: v })}
              prefix="$"
              placeholder="e.g. 200"
            />
          </div>

          {/* Debt allocation */}
          {loanAmount > 0 && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Which debts will you pay with this loan?
                </p>
                <div className="space-y-2">
                  {debts.map((debt) => {
                    const target = getTarget(debt.id)
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
                          <p className="text-xs text-gray-400">
                            {formatCurrency(balance)} · {debt.annualRate}% APR
                          </p>
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
                              className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap font-medium"
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

              {/* Allocation summary */}
              <div className={[
                'rounded-xl px-4 py-3 flex items-center justify-between text-sm',
                isOverAllocated
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50 border border-gray-200',
              ].join(' ')}>
                <span className={isOverAllocated ? 'text-red-600 font-medium' : 'text-gray-500'}>
                  {isOverAllocated
                    ? `Over-allocated by ${formatCurrency(totalAllocated - loanAmount)}`
                    : `Allocated: ${formatCurrency(totalAllocated)} of ${formatCurrency(loanAmount)}`}
                </span>
                {!isOverAllocated && remaining > 0.01 && (
                  <span className="text-gray-400 text-xs">
                    {formatCurrency(remaining)} unallocated
                  </span>
                )}
                {!isOverAllocated && remaining <= 0.01 && totalAllocated > 0 && (
                  <span className="text-green-600 text-xs font-medium">Fully allocated</span>
                )}
              </div>

              {parseFloat(loan.monthlyPayment) > 0 && (
                <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  The loan ({formatCurrency(loanAmount)} at {loan.annualRate || 0}% APR) will be repaid at{' '}
                  {formatCurrency(parseFloat(loan.monthlyPayment))}/mo alongside your other debts.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
