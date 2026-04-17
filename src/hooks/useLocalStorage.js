import { useEffect, useRef } from 'react'
import useDebtStore from '../store/useDebtStore'

const STORAGE_KEY = 'debtclear_v1'

export function useLocalStorageSync() {
  const debts = useDebtStore((s) => s.debts)
  const loanConfig = useDebtStore((s) => s.loanConfig)
  const firstDebtId = useDebtStore((s) => s.firstDebtId)
  const setDebts = useDebtStore((s) => s.setDebts)
  const setLoanConfig = useDebtStore((s) => s.setLoanConfig)
  const setFirstDebtId = useDebtStore((s) => s.setFirstDebtId)

  const loaded = useRef(false)

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (Array.isArray(data.debts) && data.debts.length > 0) setDebts(data.debts)
        if (data.loanConfig) setLoanConfig(data.loanConfig)
        if (data.firstDebtId) setFirstDebtId(data.firstDebtId)
      }
    } catch {}
    loaded.current = true
  }, [])

  // Persist on every change (skip the initial load to avoid a write before read)
  useEffect(() => {
    if (!loaded.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ debts, loanConfig, firstDebtId }))
  }, [debts, loanConfig, firstDebtId])
}
