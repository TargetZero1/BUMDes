Automated Test Scaffold — BUMDes Mulyoarjo

Recommended stack
- Unit / component tests: `Vitest` + `@testing-library/react`
- End-to-end: `Playwright` (browser-level) or `Cypress` (alternative)
- API / integration checks: SQL queries via `psql` or `mcp_supabase_execute_sql` in CI for RLS verification

Quick setup (npm)
1. Install dependencies (example):

   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom playwright

2. Add scripts to `package.json`:

  "scripts": {
    "test:unit": "vitest",
    "test:e2e": "playwright test",
    "test": "npm run test:unit && npm run test:e2e"
  }

Playwright quickstart
- Run `npx playwright install` to install browsers.
- Create `playwright.config.ts` with baseURL pointing to your dev server (or use `http://localhost:5173`).

Test locations (suggested)
- Unit/component: `tests/unit/` (Vitest)
- E2E: `tests/e2e/` (Playwright)

Example CI (GitHub Actions)
- Run `npm ci`, `npx playwright install --with-deps`, `npm run test` on PRs to `main`.

Minimal example tests are added under `tests/` as starting points.

Notes
- Keep E2E tests focused and deterministic: seed DB with known fixtures, run tests, then teardown.
- Use Playwright Trace Viewer to debug flaky tests.
- For RLS tests, include SQL checks that attempt forbidden writes and assert they fail.

