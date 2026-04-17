import './index.css'
import useDebtStore from './store/useDebtStore'
import { useLocalStorageSync } from './hooks/useLocalStorage'
import Captcha from './components/Captcha'
import DebtForm from './components/DebtForm'
import AttackOrder from './components/AttackOrder'
import Dashboard from './components/Dashboard'

export default function App() {
  useLocalStorageSync()

  const captchaPassed = useDebtStore((s) => s.captchaPassed)
  const setCaptchaPassed = useDebtStore((s) => s.setCaptchaPassed)
  const step = useDebtStore((s) => s.step)
  const setStep = useDebtStore((s) => s.setStep)

  if (!captchaPassed) {
    return <Captcha onPass={() => setCaptchaPassed(true)} />
  }

  if (step === 'form') {
    return <DebtForm onContinue={() => setStep('order')} />
  }

  if (step === 'order') {
    return (
      <AttackOrder
        onBack={() => setStep('form')}
        onContinue={() => setStep('dashboard')}
      />
    )
  }

  return <Dashboard onBack={() => setStep('form')} />
}
