# DebtClear — Claude Code Project Guide

## Project Overview

DebtClear is a **fully client-side Single Page Application (SPA)** — a debt payoff strategy calculator using the avalanche method. No backend, no database, no user data leaves the browser. Designed to be open-sourced on GitHub under MIT license.

**Live goal:** User enters their debts → sees exactly when they'll be debt-free → downloads an Excel strategy file.

---

## Tech Stack (actual installed versions)

| Technology | Installed | Role |
|---|---|---|
| React | 19.x | UI components |
| Vite | 8.x | Build tool |
| Tailwind CSS | 4.x (via `@tailwindcss/vite` plugin — no `tailwind.config.js`) | Styling |
| Zustand | 5.x | Global state management |
| Recharts | 3.x | Balance evolution chart |
| SheetJS (xlsx) | 0.18.x | Client-side Excel export |
| Vitest | 4.x + jsdom | Unit testing |
| localStorage | Native | Data persistence |

> ⚠️ Tailwind v4 syntax: use `@import "tailwindcss"` in CSS, NOT `@tailwind base/components/utilities`.
> Config is in `vite.config.js` via `tailwindcss()` plugin, NOT in a separate `tailwind.config.js`.

---

## Project Structure

```
source-code/
  src/
    components/
      Captcha.jsx          # ✅ Implemented — math CAPTCHA gate
      DebtForm.jsx         # ✅ Implemented — debt entry form (up to 5 debts)
      AttackOrder.jsx      # ✅ Implemented — drag/reorder attack priority
      Dashboard.jsx        # ✅ Implemented — summary cards + per-debt breakdown
      BalanceChart.jsx     # 🔲 Stub — Recharts line chart (Sprint 3)
      LoanModule.jsx       # 🔲 Stub — personal loan toggle panel (Sprint 3)
      ComparisonPanel.jsx  # 🔲 Stub — with vs without loan (Sprint 3)
      ExcelExport.jsx      # 🔲 Stub — SheetJS download button (Sprint 4)
    engine/
      simulate.js          # ✅ Implemented — avalanche engine (pure JS)
      formatters.js        # ✅ Implemented — formatCurrency, formatDate
      excelBuilder.js      # 🔲 Stub — SheetJS workbook builder (Sprint 4)
    store/
      useDebtStore.js      # ✅ Implemented — Zustand global state
    hooks/
      useLocalStorage.js   # ✅ Implemented — localStorage sync
    test/
      simulate.test.js     # ✅ 7 tests passing
      setup.js
    App.jsx                # ✅ Step-based navigation (captcha → form → order → dashboard)
    main.jsx
    index.css              # Uses @import "tailwindcss"
  public/
  index.html
  vite.config.js
  vitest.config.js
  package.json
  CLAUDE.md
```

---

## App Navigation Model

Navigation is controlled by a `step` field in Zustand (not React Router):

```
captchaPassed === false  →  <Captcha />
step === 'form'          →  <DebtForm />        (default after captcha)
step === 'order'         →  <AttackOrder />
step === 'dashboard'     →  <Dashboard />
```

**App.jsx reads these from the store and renders the right component.** No URL changes.

---

## Debt Object Shape

```js
{
  id: string,            // crypto.randomUUID()
  name: string,          // e.g. "Visa", "MasterCard"
  balance: string,       // stored as string from input, parsed via parseFloat()
  annualRate: string,    // annual interest rate in %, e.g. "18.5"
  minPayment: string,    // minimum monthly payment
  monthlyPayment: string,// payment user wants to assign per month
  type: 'credit_card' | 'personal_loan'
}
```

> All numeric fields are stored as **strings** (direct from `<input>` values). Always use `parseFloat()` before math.

---

## Zustand Store (actual implementation)

```js
// useDebtStore.js
{
  // State
  debts: [],             // Debt[] (max 5)
  attackOrder: [],       // string[] — debt IDs in attack priority order
  loanConfig: null,      // { amount, annualRate, monthlyPayment, targetDebtId } | null
  captchaPassed: false,  // session-only, NOT persisted to localStorage
  step: 'form',          // 'form' | 'order' | 'dashboard'

  // Actions
  setDebts(debts),       // ⚠️ Also auto-syncs attackOrder (adds new IDs at end, removes deleted)
  setAttackOrder(ids),
  setLoanConfig(config),
  setCaptchaPassed(bool),
  setStep(step),
}
```

> **Important:** `setDebts()` automatically keeps `attackOrder` in sync — it merges existing order with new debt IDs, removing deleted ones and appending new ones at the end. Do NOT call `setAttackOrder` manually when adding/removing debts.

---

## localStorage Persistence

Key: `debtclear_v1`

```json
{
  "debts": [],
  "attackOrder": [],
  "loanConfig": null
}
```

**`captchaPassed` is NOT saved to localStorage** — it resets each session intentionally (the CAPTCHA is a simple bot gate, not a real auth wall).

Sync is handled by `useLocalStorageSync()` hook called once in `App.jsx`. It loads on mount and writes on every change to `debts`, `attackOrder`, or `loanConfig`.

---

## Core Business Logic — Avalanche Simulation Engine

`src/engine/simulate.js` — pure JS, zero React/Zustand imports.

### Actual function signature

```js
export function simulate(debts, attackOrder = [], loanConfig = null)
// Returns: { timeline, debtPayoffMonths, totalInterest, totalMonths }
```

### How it works

1. **Month 0:** If loan is active, subtract `loanConfig.amount` from `loanConfig.targetDebtId` balance immediately.
2. **Each month (loop):**
   - Apply monthly interest: `balance += balance * (annualRate / 100 / 12)`
   - Pay minimum to every active debt; track `available = totalBudget - loanPayment - sumMinimums`
   - Apply `available` surplus to the first non-paid debt in `attackOrder`
   - When a debt reaches `< $0.005` → mark as paid, its budget naturally rolls into surplus
3. **Stop** when all debts are paid, or after 600 months (safety cap).

### Return value

```js
{
  timeline: [{ month: number, balances: { [debtId]: number } }],
  debtPayoffMonths: { [debtId]: number },  // 0 = paid by lump sum at month 0
  totalInterest: number,
  totalMonths: number,
}
```

### Personal Loan effects

- **Lump sum at month 0:** Reduces target debt balance immediately
- **Monthly payment:** `loanConfig.monthlyPayment` is subtracted from `available` budget every month (parallel payment to lender)

---

## Math CAPTCHA

- Random arithmetic question, client-side only
- Numbers: 1–10, operations: `+`, `-`, `x` (multiply)
- For subtraction: always shows larger number first (no negative answers)
- On pass: `setCaptchaPassed(true)` in Zustand (session only)
- On fail: generates a new question automatically

---

## Excel Export — 3 Sheets (Sprint 4)

`src/engine/excelBuilder.js` — SheetJS, client-side only.

| Sheet | Content |
|---|---|
| Sheet 1 — Summary | Debt list: name, balance, rate, payoff date, interest paid. Plus totals row and debt-free date |
| Sheet 2 — Month-by-Month | Rows = months 1…N, columns = debt balances. The chart's underlying data |
| Sheet 3 — Comparison | Side-by-side: without loan vs with loan (months, interest paid, savings) |

---

## UI Theme

**Light theme with indigo accents.** Colors in use:

| Purpose | Value |
|---|---|
| Primary accent | `indigo-600` (#4f46e5) |
| Page background | `gray-50` |
| Card background | `white` with `border-gray-200` |
| Highlight card (debt-free date) | `bg-indigo-600 text-white` |
| Error states | `red-500` |
| Muted text | `gray-400` / `gray-500` |

> The original doc mentioned a dark navy theme — this was reconsidered in favor of a cleaner, more accessible light UI. A dark mode toggle can be added in v2.

---

## Coding Conventions

- **Language:** JavaScript (JSX) — no TypeScript for MVP
- **Components:** Functional only, no class components
- **Styling:** Tailwind utility classes only — no external CSS unless necessary
- **State:** Global state in Zustand. Local UI state (focus, error flash) in `useState`
- **No prop drilling:** Components read from Zustand directly
- **Engine is pure:** `simulate.js` and `excelBuilder.js` must have zero React/Zustand imports
- **Numeric inputs:** Stored as strings in state; always `parseFloat()` before calculations
- **Formatting:** 2-space indentation, single quotes, semicolons allowed (match existing code)
- **File naming:** PascalCase for components, camelCase for engine/hooks/store

---

## Testing Strategy (Vitest)

Tests live in `src/test/`. Run with `npm test`.

Current coverage (`simulate.test.js`):
- ✅ Empty debts → zeros
- ✅ Single debt 0% APR → exact payoff month
- ✅ Interest accrues on non-zero rate
- ✅ Balance is 0 at payoff month
- ✅ Avalanche rollover to second debt
- ✅ Loan lump sum reduces balance at month 0
- ✅ Full lump sum covers debt → payoffMonth = 0

Still needed (Sprint 3–4):
- Loan monthly payment reduces available budget
- 0% interest loan → no interest accrues
- Loan amount > debt balance → excess unused (doesn't go negative)
- Card budget floors at 0 if loan payment is too large

---

## Sprint Plan

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Project setup, CAPTCHA, debt form, localStorage | ✅ Done |
| Sprint 2 | Simulation engine + tests, attack order selector, dashboard cards | ✅ Done |
| Sprint 3 | Recharts balance chart, personal loan module, comparison panel | 🔲 Next |
| Sprint 4 | Excel export (3 sheets), UI polish, mobile QA, Vercel deploy, README | 🔲 Pending |

---

## GitHub Setup

- Repo: `github.com/[your-username]/debtclear`
- License: MIT
- Current branch: `master` (rename to `main` before publishing)
- Commit convention: `feat:`, `fix:`, `test:`, `docs:` (conventional commits)
- PR before merging to main (good habit for open source)

---

## What NOT to Do

- No backend, no API calls, no server
- No database (not Firebase, not Supabase)
- No user authentication
- No external CAPTCHA services (no reCAPTCHA)
- No Redux — Zustand only
- No class components
- No TypeScript in MVP
- Never transmit user financial data anywhere
- Do NOT import React/Zustand inside `simulate.js` or `excelBuilder.js`
- Do NOT create a `tailwind.config.js` — Tailwind v4 is configured via the Vite plugin

---

## Key Decisions Already Made

| Decision | Reason |
|---|---|
| Excel (.xlsx) over PDF | User can edit their own numbers; better on mobile |
| SheetJS over jsPDF | No html2canvas dependency, cleaner output |
| Zustand over Context API | Less boilerplate, easier for contributors |
| Math CAPTCHA over reCAPTCHA | No Google dependency, privacy-friendly |
| localStorage over cookies | Simpler API, more storage |
| Vite over CRA | Faster, modern, actively maintained |
| Tailwind v4 | No config file needed, simpler setup |
| String inputs in store | Direct from `<input>` — no conversion on every keystroke |
| `step` in Zustand for navigation | No React Router needed for a linear SPA flow |
| `captchaPassed` NOT in localStorage | It's a bot gate, not auth — re-check each session is fine |

---

*This file is the source of truth for Claude Code sessions on this project. Always read it before writing code.*
