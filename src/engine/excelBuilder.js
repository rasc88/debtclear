import * as XLSX from 'xlsx'
import { formatDate } from './formatters'

// ─── helpers ─────────────────────────────────────────────────────────────────

const usd = (n) => ({
  v: Math.round(n * 100) / 100,
  t: 'n',
  z: '"$"#,##0.00',
})

const pct = (n) => ({
  v: parseFloat(n) / 100,
  t: 'n',
  z: '0.00%',
})

const bold = (v) => ({ v, t: 's', s: { font: { bold: true } } })

function setColWidths(ws, widths) {
  ws['!cols'] = widths.map((w) => ({ wch: w }))
}

function aoaToSheet(rows) {
  return XLSX.utils.aoa_to_sheet(rows)
}

// ─── Sheet 1 — Summary ───────────────────────────────────────────────────────

function buildSummarySheet(debts, attackOrder, resultWithout, resultWith, loanConfig) {
  const orderedDebts = attackOrder
    .map((id) => debts.find((d) => d.id === id))
    .filter(Boolean)

  const result = loanConfig?.enabled ? resultWith : resultWithout

  // Per-debt interest (approx from timeline)
  const perDebtInterest = {}
  debts.forEach((d) => { perDebtInterest[d.id] = 0 })
  result.timeline.forEach((snap, i) => {
    debts.forEach((d) => {
      const prev = i === 0 ? parseFloat(d.balance) : result.timeline[i - 1].balances[d.id]
      perDebtInterest[d.id] += prev * (parseFloat(d.annualRate) / 100 / 12)
    })
  })

  const rows = [
    ['DebtClear — Debt Payoff Plan'],
    [`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`],
    [],
    ['Debt Name', 'Balance', 'Annual Rate', 'Min Payment', 'Assigned Payment', 'Payoff Date', 'Interest Paid'],
    ...orderedDebts.map((d) => [
      d.name,
      usd(parseFloat(d.balance)),
      pct(d.annualRate),
      usd(parseFloat(d.minPayment)),
      usd(parseFloat(d.monthlyPayment)),
      result.debtPayoffMonths[d.id] === 0
        ? 'Paid by loan (month 0)'
        : formatDate(result.debtPayoffMonths[d.id] ?? result.totalMonths),
      usd(perDebtInterest[d.id]),
    ]),
    [],
    ['TOTAL', '', '', '', '', '', usd(result.totalInterest)],
    [],
    ['Debt-Free Date', formatDate(result.totalMonths)],
    ['Months to debt-free', result.totalMonths],
  ]

  if (loanConfig?.enabled) {
    rows.push(
      [],
      ['── Personal Loan ──'],
      ['Lump Sum Applied', usd(parseFloat(loanConfig.amount || 0))],
      ['Annual Rate', pct(loanConfig.annualRate)],
      ['Monthly Payment', usd(parseFloat(loanConfig.monthlyPayment || 0))],
      ['Applied To', debts.find((d) => d.id === loanConfig.targetDebtId)?.name ?? '—'],
    )
  }

  const ws = aoaToSheet(rows)
  setColWidths(ws, [22, 14, 13, 14, 17, 20, 14])
  return ws
}

// ─── Sheet 2 — Month-by-Month Plan ───────────────────────────────────────────

function buildMonthlySheet(debts, attackOrder, timeline) {
  const orderedDebts = attackOrder
    .map((id) => debts.find((d) => d.id === id))
    .filter(Boolean)

  const header = ['Month', ...orderedDebts.map((d) => d.name), 'Total Remaining']

  const rows = [header]

  // Month 0 — initial balances
  const initTotal = orderedDebts.reduce((s, d) => s + parseFloat(d.balance), 0)
  rows.push([0, ...orderedDebts.map((d) => usd(parseFloat(d.balance))), usd(initTotal)])

  for (const { month, balances } of timeline) {
    const total = orderedDebts.reduce((s, d) => s + (balances[d.id] ?? 0), 0)
    rows.push([
      month,
      ...orderedDebts.map((d) => usd(balances[d.id] ?? 0)),
      usd(total),
    ])
  }

  const ws = aoaToSheet(rows)
  setColWidths(ws, [8, ...orderedDebts.map(() => 14), 16])
  return ws
}

// ─── Sheet 3 — Scenario Comparison ───────────────────────────────────────────

function buildComparisonSheet(resultWithout, resultWith, loanConfig) {
  const loanEnabled = loanConfig?.enabled
  const monthsSaved = resultWithout.totalMonths - resultWith.totalMonths
  const interestSaved = resultWithout.totalInterest - resultWith.totalInterest

  const rows = [
    ['DebtClear — Scenario Comparison'],
    [],
    ['', 'Without Loan', loanEnabled ? 'With Loan' : 'N/A'],
    ['Months to debt-free', resultWithout.totalMonths, loanEnabled ? resultWith.totalMonths : '—'],
    ['Total interest paid', usd(resultWithout.totalInterest), loanEnabled ? usd(resultWith.totalInterest) : '—'],
    ['Debt-free date', formatDate(resultWithout.totalMonths), loanEnabled ? formatDate(resultWith.totalMonths) : '—'],
    [],
    loanEnabled
      ? ['Savings with loan', '', '']
      : ['(Enable personal loan to see comparison)'],
  ]

  if (loanEnabled) {
    rows.push(
      ['Months saved', '', monthsSaved > 0 ? monthsSaved : 0],
      ['Interest saved', '', interestSaved > 0 ? usd(interestSaved) : usd(0)],
    )
  }

  const ws = aoaToSheet(rows)
  setColWidths(ws, [26, 16, 16])
  return ws
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Builds and triggers download of DebtClear_Plan.xlsx.
 * @param {{ debts, attackOrder, loanConfig, resultWithout, resultWith }} data
 */
export function buildAndDownload({ debts, attackOrder, loanConfig, resultWithout, resultWith }) {
  const wb = XLSX.utils.book_new()

  const activeResult = loanConfig?.enabled ? resultWith : resultWithout

  XLSX.utils.book_append_sheet(
    wb,
    buildSummarySheet(debts, attackOrder, resultWithout, resultWith, loanConfig),
    'Summary',
  )
  XLSX.utils.book_append_sheet(
    wb,
    buildMonthlySheet(debts, attackOrder, activeResult.timeline),
    'Month-by-Month Plan',
  )
  XLSX.utils.book_append_sheet(
    wb,
    buildComparisonSheet(resultWithout, resultWith, loanConfig),
    'Scenario Comparison',
  )

  XLSX.writeFile(wb, 'DebtClear_Plan.xlsx')
}
