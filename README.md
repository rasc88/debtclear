# 💳 DebtClear

> A free, client-side debt payoff strategy calculator using the avalanche method.

No login. No server. No data ever leaves your browser.

<!-- Add screenshot here once deployed -->
<!-- ![DebtClear screenshot](docs/screenshot.png) -->

## Features

- **Avalanche simulation** — pay off debts in priority order with full budget rollover
- **Up to 5 debts** — credit cards and personal loans
- **Personal loan module** — simulate a lump-sum payoff and compare scenarios instantly
- **Balance evolution chart** — visualize your debt payoff over time (Recharts)
- **Excel export** — download a `.xlsx` file with 3 sheets: Summary, Month-by-Month, Comparison
- **localStorage persistence** — your data survives page refreshes, no account needed
- **Math CAPTCHA** — simple bot protection, no Google/reCAPTCHA dependency
- **Fully client-side** — deployable as a static site on Vercel, Netlify, or GitHub Pages

## Live Demo

<!-- Add link once deployed -->
Coming soon.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+ (use [nvm](https://github.com/nvm-sh/nvm) to manage versions)

### Install & run

```bash
git clone https://github.com/your-username/debtclear.git
cd debtclear/source-code
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set **Root Directory** to `source-code`
4. Framework preset: **Vite**
5. Deploy — done. No environment variables needed.

## How It Works

1. **CAPTCHA** — solve a simple math question to unlock the app
2. **Enter debts** — name, balance, interest rate, minimum payment, monthly payment (up to 5)
3. **Set attack order** — choose which debt to pay down first (auto-sort by highest rate = avalanche)
4. **See your plan** — debt-free date, total interest, balance chart, per-debt breakdown
5. **Optional: Personal loan** — toggle to simulate taking a loan as a lump sum, see the comparison
6. **Download** — get a `.xlsx` file with your full personalized payoff strategy

## Tech Stack

| Technology | Role |
|---|---|
| React 19 + Vite 8 | UI & build |
| Tailwind CSS 4 | Styling |
| Zustand 5 | State management |
| Recharts 3 | Balance chart |
| SheetJS (xlsx) | Excel export |
| Vitest 4 | Unit testing |

## Project Structure

```
source-code/src/
  components/   UI components (Captcha, DebtForm, AttackOrder, Dashboard, …)
  engine/       Pure-JS logic (simulate.js, formatters.js, excelBuilder.js)
  store/        Zustand global state (useDebtStore.js)
  hooks/        localStorage sync (useLocalStorage.js)
  test/         Vitest unit tests
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

[MIT](LICENSE) — free for anyone to use, fork, and contribute.
