# Contributing to DebtClear

Thanks for your interest in contributing! This is a small open-source project and all contributions are welcome.

## Getting started

1. Fork the repo and clone your fork
2. `cd source-code && npm install`
3. Create a feature branch: `git checkout -b feat/your-feature`
4. Make your changes, add tests if relevant
5. `npm test` — make sure all tests pass
6. `npm run build` — make sure the build is clean
7. Open a Pull Request against `main`

## Guidelines

- **No backend** — this app is intentionally client-side only. Do not add API calls, servers, or databases.
- **No TypeScript** in the MVP — keep it accessible for contributors of all levels.
- **Engine is pure JS** — `src/engine/simulate.js` and `src/engine/excelBuilder.js` must not import React or Zustand.
- **Tailwind only** — use utility classes; avoid custom CSS files unless unavoidable.
- **Match the existing code style** — 2-space indentation, single quotes.
- **Write tests** for any changes to `src/engine/`.

## Good first issues

- Add snowball method option (lowest balance first)
- Dark mode toggle
- Support more than 5 debts
- Improve mobile chart readability
- Add currency selector (EUR, GBP, etc.)
- Improve Excel sheet formatting

## Commit messages

Use [conventional commits](https://www.conventionalcommits.org/):

```
feat: add snowball method
fix: correct interest calculation for 0% APR
test: add edge case for single debt
docs: update README with deploy instructions
```

## Questions?

Open a GitHub Issue — happy to help.
