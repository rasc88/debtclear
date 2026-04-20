import './index.css'
import useDebtStore from './store/useDebtStore'
import { useLocalStorageSync } from './hooks/useLocalStorage'
import Captcha from './components/Captcha'
import DebtForm from './components/DebtForm'
import AttackOrder from './components/AttackOrder'
import Dashboard from './components/Dashboard'

const STEPS = [
  { key: 'form', label: 'Debts' },
  { key: 'order', label: 'Priority' },
  { key: 'dashboard', label: 'Plan' },
]

function StepBar({ current }) {
  const idx = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div
            className={[
              'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
              i < idx ? 'bg-indigo-600 text-white'
                : i === idx ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                : 'bg-gray-100 text-gray-400',
            ].join(' ')}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:inline ${i === idx ? 'text-indigo-700 font-medium' : 'text-gray-400'}`}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-px mx-1 ${i < idx ? 'bg-indigo-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function AppShell({ step, children }) {
  const setStep = useDebtStore((s) => s.setStep)
  const setDebts = useDebtStore((s) => s.setDebts)

  const clearAll = () => {
    if (!confirm('Clear all your debt data?')) return
    localStorage.removeItem('debtclear_v1')
    setDebts([])
    setStep('form')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-indigo-700">💳 DebtClear</span>
          </div>
          <div className="flex items-center gap-4">
            <StepBar current={step} />
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="Clear all data"
            >
              Reset
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  )
}

export default function App() {
  useLocalStorageSync()

  const captchaPassed = useDebtStore((s) => s.captchaPassed)
  const setCaptchaPassed = useDebtStore((s) => s.setCaptchaPassed)
  const step = useDebtStore((s) => s.step)
  const setStep = useDebtStore((s) => s.setStep)

  //if (!captchaPassed) {
  //  return <Captcha onPass={() => setCaptchaPassed(true)} />
  //}

  setCaptchaPassed(true); // BYPASS

  return (
    <AppShell step={step}>
      {step === 'form' && <DebtForm onContinue={() => setStep('order')} />}
      {step === 'order' && (
        <AttackOrder
          onBack={() => setStep('form')}
          onContinue={() => setStep('dashboard')}
        />
      )}
      {step === 'dashboard' && <Dashboard onBack={() => setStep('form')} />}
    </AppShell>
  )
}
