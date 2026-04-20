import { useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'
import { formatCurrency } from '../engine/formatters'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function sliderMax(debt) {
  const balance = parseFloat(debt.balance) || 0
  const current = parseFloat(debt.monthlyPayment) || 0
  return Math.ceil(Math.max(balance * 0.5, current * 3, 500) / 50) * 50
}

export default function DebtSliders({ debts, attackOrder }) {
  const setDebts = useDebtStore((s) => s.setDebts)
  const setAttackOrder = useDebtStore((s) => s.setAttackOrder)

  const updatePayment = useCallback(
    (id, raw) => {
      const value = Math.max(0, parseInt(raw, 10) || 0)
      setDebts(debts.map((d) => (d.id === id ? { ...d, monthlyPayment: String(value) } : d)))
    },
    [debts, setDebts],
  )

  const promoteToFirst = useCallback(
    (id) => setAttackOrder([id, ...attackOrder.filter((x) => x !== id)]),
    [attackOrder, setAttackOrder],
  )

  const orderedDebts = attackOrder.map((id) => debts.find((d) => d.id === id)).filter(Boolean)
  const total = debts.reduce((s, d) => s + (parseInt(d.monthlyPayment, 10) || 0), 0)
  const firstId = attackOrder[0]

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4 shadow-lg">
      {/* ── Monthly payments ── */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">
          Monthly card payments
        </p>

        <div className="space-y-5">
          {orderedDebts.map((debt, i) => {
            const color = COLORS[i % COLORS.length]
            const payment = parseInt(debt.monthlyPayment, 10) || 0
            const min = Math.floor(parseFloat(debt.minPayment) || 0)
            const max = sliderMax(debt)
            const pct = max > min ? ((payment - min) / (max - min)) * 100 : 0
            const TRACK_EMPTY = '#374151'

            return (
              <div key={debt.id}>
                {/* Name + input */}
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

                {/* Slider — gradient shows filled portion, CSS var controls thumb color */}
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

                {/* Range labels */}
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>${min.toLocaleString()}</span>
                  <span>${max.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-800">
          <span className="text-sm text-gray-400">Total monthly budget</span>
          <span className="text-xl font-bold text-white">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* ── Attack order selector ── */}
      <div className="bg-gray-800/60 px-5 py-4">
        <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
          Which debt do you attack first?
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${orderedDebts.length}, 1fr)` }}>
          {orderedDebts.map((debt, i) => {
            const color = COLORS[i % COLORS.length]
            const isFirst = debt.id === firstId

            return (
              <button
                key={debt.id}
                onClick={() => promoteToFirst(debt.id)}
                className="rounded-xl py-3 px-3 text-center transition-all border-2"
                style={{
                  borderColor: isFirst ? color : '#374151',
                  backgroundColor: isFirst ? `${color}18` : 'transparent',
                }}
              >
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: isFirst ? color : '#9ca3af' }}
                >
                  {debt.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: isFirst ? color : '#6b7280' }}>
                  Rate {debt.annualRate}%
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
