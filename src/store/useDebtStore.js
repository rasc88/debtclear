import { create } from 'zustand'

const useDebtStore = create((set) => ({
  debts: [],
  loanConfig: null,
  firstDebtId: null,
  captchaPassed: false,
  showDashboard: false,

  setDebts: (debts) => set({ debts }),
  setLoanConfig: (loanConfig) => set({ loanConfig }),
  setFirstDebtId: (firstDebtId) => set({ firstDebtId }),
  setCaptchaPassed: (captchaPassed) => set({ captchaPassed }),
  setShowDashboard: (showDashboard) => set({ showDashboard }),
}))

export default useDebtStore
