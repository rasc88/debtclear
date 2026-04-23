import { useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'
import { formatCurrency } from '../engine/formatters'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const TRACK_EMPTY = '#e5e7eb' // gray-200 — light theme track

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
  const setDebts    = useDebtStore((s) => s.setDebts)
  const loan        = useDebtStore((s) => s.loanConfig)
  const updateLoan  = useDebtStore((s) => s.updateLoan)

  // ── Slider logic ────────────────────────────────────────────────────────────

  const updatePayment = useCallback(
    (id, raw) => {
      const value = Math.max(0, parseInt(raw, 10) || 0)
      setDebts(debts.map((d) => (d.id === id ? { ...d, monthlyPayment: String(value) } : d)))
    },
    [debts, setDebts],
  )

  const colorMap = Object.fromEntries(debts.map((d, i) => [d.id, COLORS[i % COLORS.length]]))

  const loanPaidIds = new Set(
    loan.enabled
      ? (loan.targets ?? [])
          .filter((t) => {
            const debt = debts.find((d) => d.id === t.debtId)
            return debt && (parseFloat(t.amount) || 0) >= (parseFloat(debt.balance) || 0)
          })
          .map((t) => t.debtId)
      : [],
  )

  const activeDebts  = debts.filter((d) => !loanPaidIds.has(d.id))
  const loanPayment  = loan.enabled ? (parseInt(loan.monthlyPayment, 10) || 0) : 0
  const cardTotal    = activeDebts.reduce((s, d) => s + (parseInt(d.monthlyPayment, 10) || 0), 0)
  const total        = cardTotal + loanPayment

  // ── Loan logic ──────────────────────────────────────────────────────────────

  const loanAmount      = parseFloat(loan.amount) || 0
  const targets         = loan.targets ?? []
  const totalAllocated  = targets.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
  const remaining       = loanAmount - totalAllocated
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4">

      {/* ── Section 1: Monthly payments ── */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Monthly payments
        </p>

        <div className="space-y-5">
          {activeDebts.map((debt) => {
            const color    = colorMap[debt.id]
            const payment  = parseInt(debt.monthlyPayment, 10) || 0
            const balance  = parseFloat(debt.balance) || 0
            const rate     = parseFloat(debt.annualRate) || 0
            const interest = Math.ceil(balance * (rate / 100 / 12))
            const min      = Math.max(Math.floor(parseFloat(debt.minPayment) || 0), interest + 1)
            const max      = Math.max(Math.ceil(balance / 50) * 50, payment, min, 100)
            const pct      = max > min ? ((payment - min) / (max - min)) * 100 : 0

            return (
              <div key={debt.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color }}>{debt.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      value={payment}
                      min={min}
                      max={max}
                      onChange={(e) => updatePayment(debt.id, e.target.value)}
                      className="w-20 border border-gray-200 text-gray-800 text-sm font-bold text-center rounded-lg py-1 px-2 focus:outline-none focus:ring-1"
                      style={{ '--tw-ring-color': color }}
                    />
                  </div>
                </div>

                <input
                  type="range"
                  min={min}
                  max={max}
                  step={10}
                  value={payment}
                  onChange={(e) => updatePayment(debt.id, e.target.value)}
                  className="w-full"
                  style={{
                    '--slider-color': color,
                    background: `linear-gradient(to right, ${color} ${pct}%, ${TRACK_EMPTY} ${pct}%)`,
                  }}
                />

                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>${min.toLocaleString()}</span>
                  <span>${max.toLocaleString()}</span>
                </div>
              </div>
            )
          })}

          {/* Loan fixed-payment row */}
          {loan.enabled && loanPayment > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-600">Personal Loan</p>
                <p className="text-xs text-gray-400 mt-0.5">Fixed payment — paid in parallel</p>
              </div>
              <span className="text-sm font-bold text-gray-700">{formatCurrency(loanPayment)}/mo</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">Total monthly budget</span>
          <span className="text-xl font-bold text-gray-800">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* ── Section 2: Personal loan simulator ── */}
      <div className="border-t border-gray-100">
        {/* Toggle header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Personal Loan Simulation</p>
            <p className="text-xs text-gray-400 mt-0.5">Borrow at a lower rate to pay off high-interest debts</p>
          </div>
          <Toggle enabled={loan.enabled} onChange={(v) => updateLoan({ enabled: v })} />
        </div>

        {/* Expanded fields */}
        {loan.enabled && (
          <div className="px-5 pb-5 space-y-4">
            {/* Loan terms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LoanField label="Loan amount"             value={loan.amount}        onChange={(v) => updateLoan({ amount: v })}         prefix="$" placeholder="e.g. 5000" />
              <LoanField label="Annual interest rate"    value={loan.annualRate}    onChange={(v) => updateLoan({ annualRate: v })}     suffix="%" placeholder="0 for interest-free" />
              <LoanField label="Monthly payment to lender" value={loan.monthlyPayment} onChange={(v) => updateLoan({ monthlyPayment: v })} prefix="$" placeholder="e.g. 200" />
            </div>

            {/* Debt allocation */}
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

                {/* Allocation summary */}
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
                    Loan of {formatCurrency(loanAmount)} at {loan.annualRate || 0}% APR repaid at{' '}
                    {formatCurrency(parseFloat(loan.monthlyPayment))}/mo alongside your debts.
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
