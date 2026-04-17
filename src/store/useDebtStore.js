import { create } from 'zustand'

const useDebtStore = create((set) => ({
  debts: [],
  loanConfig: null,
  firstDebtId: null,
  captchaPassed: false,

  setDebts: (debts) => set({ debts }),
  setLoanConfig: (loanConfig) => set({ loanConfig }),
  setFirstDebtId: (firstDebtId) => set({ firstDebtId }),
  setCaptchaPassed: (captchaPassed) => set({ captchaPassed }),
}))

export default useDebtStore
