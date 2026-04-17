import { useMemo } from 'react'
import useDebtStore from '../store/useDebtStore'
import { simulate } from '../engine/simulate'
import { formatCurrency, formatDate } from '../engine/formatters'
import BalanceChart from './BalanceChart'
import ExcelExport from './ExcelExport'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200'}`}>
      <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${accent ? 'text-indigo-200' : 'text-gray-400'}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-indigo-200' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

function DebtResultRow({ debt, payoffMonth, interest }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-800 text-sm">{debt.name}</p>
        <p className="text-xs text-gray-400">{debt.annualRate}% APR · {formatCurrency(parseFloat(debt.balance))}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-700">
          {payoffMonth === 0 ? 'Paid by loan' : formatDate(payoffMonth)}
        </p>
        <p className="text-xs text-gray-400">+{formatCurrency(interest)} interest</p>
      </div>
    </div>
  )
}

export default function Dashboard({ onBack }) {
  const debts = useDebtStore((s) => s.debts)
  const attackOrder = useDebtStore((s) => s.attackOrder)
  const loanConfig = useDebtStore((s) => s.loanConfig)

  const result = useMemo(
    () => simulate(debts, attackOrder, loanConfig),
    [debts, attackOrder, loanConfig]
  )

  // Per-debt interest: sum interest accrued each month for each debt
  const perDebtInterest = useMemo(() => {
    const interest = {}
    debts.forEach((d) => { interest[d.id] = 0 })
    for (let i = 0; i < result.timeline.length; i++) {
      debts.forEach((d) => {
        const prev = i === 0 ? parseFloat(d.balance) : result.timeline[i - 1].balances[d.id]
        const curr = result.timeline[i].balances[d.id]
        const rate = parseFloat(d.annualRate) / 100 / 12
        // interest accrued = balance before payment × rate
        interest[d.id] += prev * rate
      })
    }
    return interest
  }, [debts, result])

  const orderedDebts = attackOrder
    .map((id) => debts.find((d) => d.id === id))
    .filter(Boolean)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1">
            ← Edit debts
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Your Payoff Plan</h2>
        </div>
        <ExcelExport />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Debt-free date"
          value={formatDate(result.totalMonths)}
          sub={`${result.totalMonths} months`}
          accent
        />
        <StatCard
          label="Total interest"
          value={formatCurrency(result.totalInterest)}
        />
        <StatCard
          label="Monthly budget"
          value={formatCurrency(debts.reduce((s, d) => s + parseFloat(d.monthlyPayment || 0), 0))}
          sub="across all debts"
        />
      </div>

      {/* Balance chart placeholder — Sprint 3 */}
      <BalanceChart timeline={result.timeline} debts={debts} />

      {/* Per-debt breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Payoff breakdown</h3>
        {orderedDebts.map((debt) => (
          <DebtResultRow
            key={debt.id}
            debt={debt}
            payoffMonth={result.debtPayoffMonths[debt.id] ?? result.totalMonths}
            interest={perDebtInterest[debt.id] ?? 0}
          />
        ))}
      </div>

      {/* Attack order reminder */}
      <div className="bg-indigo-50 rounded-xl px-4 py-3 text-xs text-indigo-700">
        <strong>Attack order:</strong>{' '}
        {orderedDebts.map((d, i) => (
          <span key={d.id}>{i > 0 && ' → '}{d.name}</span>
        ))}
      </div>
    </div>
  )
}
