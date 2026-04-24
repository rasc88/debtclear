import { useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'

const MAX_DEBTS = 5

const EMPTY_DEBT = () => ({
  id: crypto.randomUUID(),
  name: '',
  balance: '',
  annualRate: '',
  minPayment: '',
  type: 'credit_card',
})

const FIELD_CONFIG = [
  { key: 'name',       label: 'Debt name',               type: 'text',   placeholder: 'e.g. Visa, MasterCard', prefix: null, suffix: null },
  { key: 'balance',    label: 'Current balance',         type: 'number', placeholder: '0.00',                  prefix: '$',  suffix: null },
  { key: 'annualRate', label: 'Annual interest rate',    type: 'number', placeholder: '0.00',                  prefix: null, suffix: '%' },
  { key: 'minPayment', label: 'Minimum monthly payment', type: 'number', placeholder: '0.00',                  prefix: '$',  suffix: null },
]

function monthlyInterest(debt) {
  return (parseFloat(debt.balance) || 0) * ((parseFloat(debt.annualRate) || 0) / 100 / 12)
}

function DebtCard({ debt, index, onChange, onRemove, canRemove }) {
  const handleField = useCallback((key, value) => onChange(debt.id, key, value), [debt.id, onChange])

  const interest   = monthlyInterest(debt)
  const minPay     = parseFloat(debt.minPayment) || 0
  const belowFloor = interest > 0 && minPay > 0 && minPay <= interest

  return (
    <div className={[
      'bg-white rounded-2xl p-5 shadow-sm border',
      belowFloor ? 'border-red-300' : 'border-gray-200',
    ].join(' ')}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          Debt #{index + 1}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(debt.id)}
            className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
            aria-label="Remove debt"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELD_CONFIG.map(({ key, label, type, placeholder, prefix, suffix }) => {
          const isMinField = key === 'minPayment'
          const fieldError = isMinField && belowFloor

          return (
            <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
              <label className={[
                'block text-xs font-medium mb-1',
                fieldError ? 'text-red-500' : 'text-gray-500',
              ].join(' ')}>
                {label}
              </label>
              <div className="relative flex items-center">
                {prefix && (
                  <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">{prefix}</span>
                )}
                <input
                  type={type}
                  value={debt[key]}
                  onChange={(e) => handleField(key, e.target.value)}
                  placeholder={placeholder}
                  min={type === 'number' ? '0' : undefined}
                  step={type === 'number' ? '0.01' : undefined}
                  className={[
                    'w-full border rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2',
                    prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-7' : 'px-3',
                    fieldError
                      ? 'border-red-400 focus:ring-red-300 text-red-700'
                      : 'border-gray-200 focus:ring-indigo-300',
                  ].join(' ')}
                />
                {suffix && (
                  <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">{suffix}</span>
                )}
              </div>

              {fieldError && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-red-500">
                    Interest is ${interest.toFixed(2)}/mo — minimum must be higher
                  </p>
                  <button
                    type="button"
                    onClick={() => handleField('minPayment', String(Math.ceil(interest) + 1))}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md whitespace-nowrap transition-colors"
                  >
                    Set ${Math.ceil(interest) + 1}/mo
                  </button>
                </div>
              )}
            </div>
          )
        })}

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <div className="flex gap-2">
            {[
              { value: 'credit_card',    label: 'Credit Card' },
              { value: 'personal_loan',  label: 'Personal Loan' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleField('type', value)}
                className={[
                  'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                  debt.type === value
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DebtForm({ onContinue }) {
  const debts          = useDebtStore((s) => s.debts)
  const setDebts       = useDebtStore((s) => s.setDebts)
  const monthlyBudget  = useDebtStore((s) => s.monthlyBudget)
  const setMonthlyBudget = useDebtStore((s) => s.setMonthlyBudget)

  const addDebt    = useCallback(() => { if (debts.length < MAX_DEBTS) setDebts([...debts, EMPTY_DEBT()]) }, [debts, setDebts])
  const removeDebt = useCallback((id) => { setDebts(debts.filter((d) => d.id !== id)) }, [debts, setDebts])
  const updateDebt = useCallback((id, key, value) => {
    setDebts(debts.map((d) => d.id === id ? { ...d, [key]: value } : d))
  }, [debts, setDebts])

  if (debts.length === 0) setDebts([EMPTY_DEBT()])

  const sumMinPayments = debts.reduce((s, d) => s + (parseFloat(d.minPayment) || 0), 0)
  const budget         = parseFloat(monthlyBudget) || 0
  const budgetTooLow   = budget > 0 && budget < sumMinPayments

  const debtsValid = debts.length > 0 && debts.every((d) => {
    const minPay   = parseFloat(d.minPayment) || 0
    const interest = monthlyInterest(d)
    return (
      d.name.trim() &&
      parseFloat(d.balance) > 0 &&
      parseFloat(d.annualRate) >= 0 &&
      minPay > 0 &&
      minPay > interest
    )
  })

  const isValid = debtsValid && budget > 0 && !budgetTooLow

  return (
    <div className="py-8 px-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Your Debts</h2>
        <p className="text-gray-500 text-sm mt-1">Enter up to {MAX_DEBTS} debts to calculate your payoff plan.</p>
      </div>

      <div className="space-y-4">
        {debts.map((debt, i) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            index={i}
            onChange={updateDebt}
            onRemove={removeDebt}
            canRemove={debts.length > 1}
          />
        ))}
      </div>

      {/* Monthly budget card */}
      <div className="mt-4 bg-white rounded-2xl p-5 shadow-sm border border-indigo-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Monthly debt budget</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Total you can put toward all debts each month
              {sumMinPayments > 0 && (
                <span className="ml-1 text-indigo-500 font-medium">
                  (min ${sumMinPayments.toFixed(0)}/mo)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">$</span>
          <input
            type="number"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="e.g. 500"
            min="0"
            step="1"
            className={[
              'w-full pl-7 pr-3 border rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2',
              budgetTooLow
                ? 'border-red-400 focus:ring-red-300 text-red-700'
                : 'border-gray-200 focus:ring-indigo-300',
            ].join(' ')}
          />
        </div>
        {budgetTooLow && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-red-500">
              Must be at least ${sumMinPayments.toFixed(0)} to cover all minimums
            </p>
            <button
              type="button"
              onClick={() => setMonthlyBudget(String(Math.ceil(sumMinPayments) + 1))}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md whitespace-nowrap transition-colors"
            >
              Set ${Math.ceil(sumMinPayments) + 1}/mo
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        {debts.length < MAX_DEBTS && (
          <button
            onClick={addDebt}
            className="flex-1 py-3 border-2 border-dashed border-indigo-300 text-indigo-500 hover:border-indigo-500 hover:text-indigo-700 rounded-xl text-sm font-medium transition-colors"
          >
            + Add another debt
          </button>
        )}
        <button
          onClick={onContinue}
          disabled={!isValid}
          className={[
            'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors',
            isValid
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          Calculate My Payoff Plan →
        </button>
      </div>

      {debts.length > 0 && !isValid && (
        <p className="text-center text-xs text-gray-400 mt-2">Fill in all fields and set a monthly budget to continue</p>
      )}
    </div>
  )
}
