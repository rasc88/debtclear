import { useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'
import { formatCurrency } from '../engine/formatters'

export default function AttackOrder({ onContinue, onBack }) {
  const debts = useDebtStore((s) => s.debts)
  const attackOrder = useDebtStore((s) => s.attackOrder)
  const setAttackOrder = useDebtStore((s) => s.setAttackOrder)

  const orderedDebts = attackOrder
    .map((id) => debts.find((d) => d.id === id))
    .filter(Boolean)

  const move = useCallback((index, direction) => {
    const next = [...attackOrder]
    const swap = index + direction
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setAttackOrder(next)
  }, [attackOrder, setAttackOrder])

  const suggestAvalanche = useCallback(() => {
    const sorted = [...debts].sort((a, b) => parseFloat(b.annualRate) - parseFloat(a.annualRate))
    setAttackOrder(sorted.map((d) => d.id))
  }, [debts, setAttackOrder])

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
        ← Back to debts
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Attack Order</h2>
        <p className="text-gray-500 text-sm mt-1">
          The first debt receives all extra budget. When it's paid off, that payment rolls to the next.
        </p>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={suggestAvalanche}
          className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          ⚡ Auto-sort by highest rate (Avalanche)
        </button>
      </div>

      <div className="space-y-2">
        {orderedDebts.map((debt, i) => (
          <div
            key={debt.id}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-gray-300 hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed leading-none text-base"
              >
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === orderedDebts.length - 1}
                className="text-gray-300 hover:text-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed leading-none text-base"
              >
                ▼
              </button>
            </div>

            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                i === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500',
              ].join(' ')}
            >
              {i + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{debt.name}</p>
              <p className="text-xs text-gray-400">
                {formatCurrency(parseFloat(debt.balance))} · {debt.annualRate}% APR
              </p>
            </div>

            {i === 0 && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0">
                Attack first
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        See My Payoff Plan →
      </button>
    </div>
  )
}
