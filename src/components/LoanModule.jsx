import useDebtStore from '../store/useDebtStore'

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

function Field({ label, value, onChange, prefix, suffix, placeholder, type = 'number' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">{prefix}</span>}
        <input
          type={type}
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

  const set = (fields) => updateLoan(fields)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-4">
      {/* Header / toggle row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-semibold text-gray-800 text-sm">Personal Loan Simulation</p>
          <p className="text-xs text-gray-400 mt-0.5">Apply a lump sum to one of your debts</p>
        </div>
        <Toggle enabled={loan.enabled} onChange={(v) => set({ enabled: v })} />
      </div>

      {/* Expanded fields */}
      {loan.enabled && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Loan amount (lump sum)"
              value={loan.amount}
              onChange={(v) => set({ amount: v })}
              prefix="$"
              placeholder="e.g. 3000"
            />
            <Field
              label="Annual interest rate"
              value={loan.annualRate}
              onChange={(v) => set({ annualRate: v })}
              suffix="%"
              placeholder="0 for interest-free"
            />
            <Field
              label="Monthly payment to lender"
              value={loan.monthlyPayment}
              onChange={(v) => set({ monthlyPayment: v })}
              prefix="$"
              placeholder="e.g. 200"
            />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Apply lump sum to</label>
              <select
                value={loan.targetDebtId ?? ''}
                onChange={(e) => set({ targetDebtId: e.target.value || null })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="">Select a debt…</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {loan.targetDebtId && parseFloat(loan.amount) > 0 && (
            <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
              ${parseFloat(loan.amount || 0).toLocaleString()} applied to{' '}
              <strong>{debts.find((d) => d.id === loan.targetDebtId)?.name}</strong> at month 0,
              then ${parseFloat(loan.monthlyPayment || 0).toLocaleString()}/mo deducted from your card budget.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
