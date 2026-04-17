import { useEffect, useRef } from 'react'
import useDebtStore from '../store/useDebtStore'

const STORAGE_KEY = 'debtclear_v1'

export function useLocalStorageSync() {
  const debts = useDebtStore((s) => s.debts)
  const attackOrder = useDebtStore((s) => s.attackOrder)
  const loanConfig = useDebtStore((s) => s.loanConfig)
  const setDebts = useDebtStore((s) => s.setDebts)
  const setAttackOrder = useDebtStore((s) => s.setAttackOrder)
  const updateLoan = useDebtStore((s) => s.updateLoan)

  const loaded = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (Array.isArray(data.debts) && data.debts.length > 0) {
          setDebts(data.debts)
          if (Array.isArray(data.attackOrder)) setAttackOrder(data.attackOrder)
        }
        if (data.loanConfig) updateLoan(data.loanConfig)
      }
    } catch {}
    loaded.current = true
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ debts, attackOrder, loanConfig }))
  }, [debts, attackOrder, loanConfig])
}
