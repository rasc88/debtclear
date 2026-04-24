import { create } from 'zustand'

const DEFAULT_LOAN = {
  enabled: false,
  amount: '',
  annualRate: '0',
  monthlyPayment: '',
  targets: [], // [{ debtId, amount }]
}

const useDebtStore = create((set, get) => ({
  debts: [],
  attackOrder: [],
  loanConfig: { ...DEFAULT_LOAN },
  monthlyBudget: '',
  captchaPassed: false,
  step: 'form',

  setDebts: (debts) => {
    const currentOrder = get().attackOrder
    const existingIds = new Set(currentOrder)
    const newIds = debts.map((d) => d.id)
    const merged = [
      ...currentOrder.filter((id) => newIds.includes(id)),
      ...newIds.filter((id) => !existingIds.has(id)),
    ]
    set({ debts, attackOrder: merged })
  },

  setAttackOrder: (attackOrder) => set({ attackOrder }),
  setMonthlyBudget: (monthlyBudget) => set({ monthlyBudget }),

  // Merge partial fields into loanConfig
  updateLoan: (fields) => set((s) => ({ loanConfig: { ...s.loanConfig, ...fields } })),

  setCaptchaPassed: (captchaPassed) => set({ captchaPassed }),
  setStep: (step) => set({ step }),
}))

export default useDebtStore
