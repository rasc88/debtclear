import './index.css'
import useDebtStore from './store/useDebtStore'
import { useLocalStorageSync } from './hooks/useLocalStorage'
import Captcha from './components/Captcha'
import DebtForm from './components/DebtForm'
import Dashboard from './components/Dashboard'

export default function App() {
  useLocalStorageSync()

  const captchaPassed = useDebtStore((s) => s.captchaPassed)
  const setCaptchaPassed = useDebtStore((s) => s.setCaptchaPassed)
  const showDashboard = useDebtStore((s) => s.showDashboard)
  const setShowDashboard = useDebtStore((s) => s.setShowDashboard)

  if (!captchaPassed) {
    return <Captcha onPass={() => setCaptchaPassed(true)} />
  }

  if (!showDashboard) {
    return <DebtForm onContinue={() => setShowDashboard(true)} />
  }

  return <Dashboard onBack={() => setShowDashboard(false)} />
}
