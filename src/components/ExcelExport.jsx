import { useState, useCallback } from 'react'
import useDebtStore from '../store/useDebtStore'
import { simulate } from '../engine/simulate'
import { buildAndDownload } from '../engine/excelBuilder'

export default function ExcelExport() {
  const [loading, setLoading] = useState(false)
  const debts = useDebtStore((s) => s.debts)
  const attackOrder = useDebtStore((s) => s.attackOrder)
  const loanConfig = useDebtStore((s) => s.loanConfig)

  const handleDownload = useCallback(() => {
    setLoading(true)
    // Defer to next tick so the spinner renders before the blocking xlsx work
    setTimeout(() => {
      try {
        const resultWithout = simulate(debts, attackOrder, null)
        const resultWith = simulate(debts, attackOrder, loanConfig)
        buildAndDownload({ debts, attackOrder, loanConfig, resultWithout, resultWith })
      } finally {
        setLoading(false)
      }
    }, 0)
  }, [debts, attackOrder, loanConfig])

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Building…
        </>
      ) : (
        <>
          ↓ Download Plan
        </>
      )}
    </button>
  )
}
