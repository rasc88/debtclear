import './index.css'
import { useLocalStorageSync } from './hooks/useLocalStorage'
import useDebtStore from './store/useDebtStore'
import Captcha from './components/Captcha'
import DebtForm from './components/DebtForm'
import Dashboard from './components/Dashboard'

export default function App() {
  useLocalStorageSync()
  const captchaPassed = useDebtStore((s) => s.captchaPassed)

  if (!captchaPassed) {
    return <Captcha onPass={() => useDebtStore.getState().setCaptchaPassed(true)} />
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">DebtClear</h1>
      <DebtForm />
      <Dashboard />
    </main>
  )
}
