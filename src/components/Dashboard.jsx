import { useMemo } from 'react'
import useDebtStore from '../store/useDebtStore'
import { simulate } from '../engine/simulate'
import { formatCurrency, formatDate } from '../engine/formatters'
import BalanceChart from './BalanceChart'
import DebtSliders from './DebtSliders'
import LoanModule from './LoanModule'
import ComparisonPanel from './ComparisonPanel'
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

  const resultWithout = useMemo(
    () => simulate(debts, attackOrder, null),
    [debts, attackOrder],
  )
  const resultWith = useMemo(
    () => simulate(debts, attackOrder, loanConfig),
    [debts, attackOrder, loanConfig],
  )

  const result = loanConfig.enabled ? resultWith : resultWithout

  const perDebtInterest = useMemo(() => {
    const acc = {}
    debts.forEach((d) => { acc[d.id] = 0 })
    result.timeline.forEach((snap, i) => {
      debts.forEach((d) => {
        const prev = i === 0 ? parseFloat(d.balance) : result.timeline[i - 1].balances[d.id]
        acc[d.id] += prev * (parseFloat(d.annualRate) / 100 / 12)
      })
    })
    return acc
  }, [debts, result])

  const orderedDebts = attackOrder
    .map((id) => debts.find((d) => d.id === id))
    .filter(Boolean)

  return (
    <div className="py-6 px-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1">
            ← Edit debts
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Your Payoff Plan</h2>
        </div>
        <ExcelExport />
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

      {/* ── Interactive controls ── */}
      <DebtSliders debts={debts} attackOrder={attackOrder} />

      {/* ── Balance chart ── */}
      <BalanceChart timeline={result.timeline} debts={orderedDebts} />

      {/* ── Personal loan module ── */}
      <LoanModule />

      {/* ── Comparison panel ── */}
      {loanConfig.enabled && (
        <ComparisonPanel without={resultWithout} with={resultWith} />
      )}

      {/* ── Per-debt breakdown ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
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
    </div>
  )
}
