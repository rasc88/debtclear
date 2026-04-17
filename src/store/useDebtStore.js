import { create } from 'zustand'

const useDebtStore = create((set, get) => ({
  debts: [],
  attackOrder: [],     // array of debt IDs in attack priority
  loanConfig: null,
  captchaPassed: false,

  // step: 'form' | 'order' | 'dashboard'
  step: 'form',

  setDebts: (debts) => {
    // Keep attackOrder in sync: add new IDs at end, remove deleted ones
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
  setLoanConfig: (loanConfig) => set({ loanConfig }),
  setCaptchaPassed: (captchaPassed) => set({ captchaPassed }),
  setStep: (step) => set({ step }),
}))

export default useDebtStore
