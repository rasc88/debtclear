import { useEffect } from 'react'
import useDebtStore from '../store/useDebtStore'

const STORAGE_KEY = 'debtclear_v1'

export function useLocalStorageSync() {
  const { debts, loanConfig, firstDebtId, captchaPassed, setDebts, setLoanConfig, setFirstDebtId, setCaptchaPassed } = useDebtStore()

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { debts, loanConfig, firstDebtId, captchaPassed } = JSON.parse(saved)
        if (debts) setDebts(debts)
        if (loanConfig) setLoanConfig(loanConfig)
        if (firstDebtId) setFirstDebtId(firstDebtId)
        if (captchaPassed) setCaptchaPassed(captchaPassed)
      }
    } catch {}
  }, [])

  // Persist to localStorage on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ debts, loanConfig, firstDebtId, captchaPassed }))
  }, [debts, loanConfig, firstDebtId, captchaPassed])
}
