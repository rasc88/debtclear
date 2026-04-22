import { useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'
import { formatCurrency } from '../engine/formatters'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DebtSliders({ debts }) {
  const setDebts = useDebtStore((s) => s.setDebts)
  const loanConfig = useDebtStore((s) => s.loanConfig)

  const updatePayment = useCallback(
    (id, raw) => {
      const value = Math.max(0, parseInt(raw, 10) || 0)
      setDebts(debts.map((d) => (d.id === id ? { ...d, monthlyPayment: String(value) } : d)))
    },
    [debts, setDebts],
  )

  // Color tied to position in original debts array (stable across any reordering)
  const colorMap = Object.fromEntries(debts.map((d, i) => [d.id, COLORS[i % COLORS.length]]))

  // Debts fully covered by the loan don't need a slider — they're already paid
  const loanPaidIds = new Set(
    loanConfig.enabled
      ? (loanConfig.targets ?? [])
          .filter((t) => {
            const debt = debts.find((d) => d.id === t.debtId)
            return debt && (parseFloat(t.amount) || 0) >= (parseFloat(debt.balance) || 0)
          })
          .map((t) => t.debtId)
      : [],
  )

  const activeDebts = debts.filter((d) => !loanPaidIds.has(d.id))

  const loanPayment = loanConfig.enabled ? (parseInt(loanConfig.monthlyPayment, 10) || 0) : 0
  const cardTotal = activeDebts.reduce((s, d) => s + (parseInt(d.monthlyPayment, 10) || 0), 0)
  const total = cardTotal + loanPayment

  const TRACK_EMPTY = '#374151'

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 shadow-lg">
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">
          Monthly payments
        </p>

        <div className="space-y-5">
          {/* Active card debts — adjustable sliders */}
          {activeDebts.map((debt) => {
            const color    = colorMap[debt.id]
            const payment  = parseInt(debt.monthlyPayment, 10) || 0
            const balance  = parseFloat(debt.balance) || 0
            const rate     = parseFloat(debt.annualRate) || 0
            // Floor: must always beat monthly interest so the balance never grows
            const interest = Math.ceil(balance * (rate / 100 / 12))
            const min      = Math.max(Math.floor(parseFloat(debt.minPayment) || 0), interest + 1)
            const max      = Math.max(Math.ceil(balance / 50) * 50, payment, min, 100)
            const pct = max > min ? ((payment - min) / (max - min)) * 100 : 0

            return (
              <div key={debt.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color }}>
                    {debt.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={payment}
                      min={min}
                      max={max}
                      onChange={(e) => updatePayment(debt.id, e.target.value)}
                      className="w-20 bg-gray-800 border border-gray-700 text-white text-sm font-bold text-center rounded-lg py-1 px-2 focus:outline-none focus:ring-1"
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

                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>${min.toLocaleString()}</span>
                  <span>${max.toLocaleString()}</span>
                </div>
              </div>
            )
          })}

          {/* Loan row — fixed payment, no slider */}
          {loanConfig.enabled && loanPayment > 0 && (
            <div className="border-t border-gray-800 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-400">Personal Loan</span>
                  <p className="text-xs text-gray-600 mt-0.5">Fixed payment — paid in parallel</p>
                </div>
                <span className="text-white text-sm font-bold">{formatCurrency(loanPayment)}/mo</span>
              </div>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-800">
          <span className="text-sm text-gray-400">Total monthly budget</span>
          <span className="text-xl font-bold text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
