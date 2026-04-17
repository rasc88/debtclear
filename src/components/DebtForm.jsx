import { useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'

const MAX_DEBTS = 5

const EMPTY_DEBT = () => ({
  id: crypto.randomUUID(),
  name: '',
  balance: '',
  annualRate: '',
  minPayment: '',
  monthlyPayment: '',
  type: 'credit_card',
})

const FIELD_CONFIG = [
  { key: 'name',           label: 'Debt name',              type: 'text',   placeholder: 'e.g. Visa, MasterCard',  prefix: null,  suffix: null },
  { key: 'balance',        label: 'Current balance',        type: 'number', placeholder: '0.00',                   prefix: '$',   suffix: null },
  { key: 'annualRate',     label: 'Annual interest rate',   type: 'number', placeholder: '0.00',                   prefix: null,  suffix: '%' },
  { key: 'minPayment',     label: 'Minimum monthly payment',type: 'number', placeholder: '0.00',                   prefix: '$',   suffix: null },
  { key: 'monthlyPayment', label: 'Assigned monthly payment',type: 'number',placeholder: '0.00',                   prefix: '$',   suffix: null },
]

function DebtCard({ debt, index, onChange, onRemove, canRemove }) {
  const handleField = useCallback((key, value) => {
    onChange(debt.id, key, value)
  }, [debt.id, onChange])

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
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
        {FIELD_CONFIG.map(({ key, label, type, placeholder, prefix, suffix }) => (
          <div key={key} className={key === 'name' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
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
                  'w-full border border-gray-200 rounded-lg py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-7' : 'px-3',
                ].join(' ')}
              />
              {suffix && (
                <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">{suffix}</span>
              )}
            </div>
          </div>
        ))}

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <div className="flex gap-2">
            {[
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'personal_loan', label: 'Personal Loan' },
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
  const debts = useDebtStore((s) => s.debts)
  const setDebts = useDebtStore((s) => s.setDebts)

  const addDebt = useCallback(() => {
    if (debts.length < MAX_DEBTS) setDebts([...debts, EMPTY_DEBT()])
  }, [debts, setDebts])

  const removeDebt = useCallback((id) => {
    setDebts(debts.filter((d) => d.id !== id))
  }, [debts, setDebts])

  const updateDebt = useCallback((id, key, value) => {
    setDebts(debts.map((d) => d.id === id ? { ...d, [key]: value } : d))
  }, [debts, setDebts])

  const isValid = debts.length > 0 && debts.every((d) =>
    d.name.trim() &&
    parseFloat(d.balance) > 0 &&
    parseFloat(d.annualRate) >= 0 &&
    parseFloat(d.minPayment) >= 0 &&
    parseFloat(d.monthlyPayment) > 0
  )

  // Initialize with one empty debt if store is empty
  if (debts.length === 0) {
    setDebts([EMPTY_DEBT()])
  }

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
        <p className="text-center text-xs text-gray-400 mt-2">Fill in all fields to continue</p>
      )}
    </div>
  )
}
