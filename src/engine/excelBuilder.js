import * as XLSX from 'xlsx'

/**
 * Builds and triggers download of the .xlsx payoff plan.
 * @param {Object} data - { debts, timeline, loanConfig }
 */
export function buildAndDownload(data) {
  const wb = XLSX.utils.book_new()
  // TODO: Sheet 1 — Summary
  // TODO: Sheet 2 — Month-by-Month Plan
  // TODO: Sheet 3 — Scenario Comparison
  XLSX.writeFile(wb, 'DebtClear_Plan.xlsx')
}
