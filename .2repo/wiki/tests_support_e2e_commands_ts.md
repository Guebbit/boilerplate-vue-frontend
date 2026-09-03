# tests/support/e2e/commands.ts

## Purpose

Declares and implements the full set of custom Cypress commands used by the e2e test suite, plus the `visit` overwrite that guards against stale-window races on successive navigations. It also injects `__E2E_API_URL` into the page's `window` so a single built bundle can be pointed at any shard's backend.

## Key elements

- **`DemoOutboxEmail`** (exported interface) — mirrors the backend's demo-outbox email shape (`to`, `subject`, `template`, `token?`, `lines?`).
- **`Cypress.Chainable` augmentation** — adds the following custom commands to the global Cypress namespace:
  - `resetState()` — resets the backend to its seed dataset (in-process `POST /__demo/reset` for demo; shells out to `LIVE_RESET_COMMAND` for live).
  - `loginAs(role?)` — logs in via the real UI flow as `'user'` (default) or `'admin'`.
  - `trackNetwork()` / `settleNetwork()` — starts a request counter before navigation; waits until no tracked request is in flight for two consecutive polls.
  - `freezeForVisual(isoTime?)` — freezes clock, animations, caret, and dev-server overlay before a screenshot comparison.
  - `compareSnapshot(name)` — screenshots the viewport and diffs against a committed baseline in `__snapshots__`.
  - `checkPageA11y(context?)` — runs axe, failing on `serious`/`critical` violations only.
  - `skipUnlessLive()` / `skipUnlessDemo()` — conditionally skip tests based on the active profile.
  - `demoEmailTo(address)` — fetches the newest demo-outbox email for a given recipient.
  - `navigateTo(path)` / `navigateViaMenu(menu, path)` — follows nav entries by their `href` (locale-prefixed path), bypassing translated labels.
  - `logout()` / `goToCart()` — shorthand navigation actions.
- **`Cypress.Commands.overwrite('visit', …)`** — marks the outgoing window with `_supersededByVisit` before each visit, then waits until the new window is no longer that one and reports app-ready, preventing commands from executing against a stale document.
- **`Cypress.on('window:before:load', …)`** — injects the captured `apiUrl` env value as `window.__E2E_API_URL` on every page load (including reloads and SPA navigations).
- **`before` hook** — captures `apiUrl` via `cy.env()` into a module-level variable (required because `allowCypressEnv: false` disables direct `Cypress.env()` access).
- **Timeout constants** — `DEMO_RESET_TIMEOUT_MS` (30 s), `APP_READY_TIMEOUT_MS` (15 s), `LIVE_RESET_TIMEOUT_MS` (60 s).

## Relationships

- **`tests/support/e2e/accounts.ts`** — supplies `E2E_ACCOUNTS`, the fixed credentials used by `loginAs()` and any spec that needs known accounts.
- **`tests/support/e2e/e2e.ts`** — the suite entry/runner that imports this module so all custom commands and the `visit` overwrite are registered before any spec executes.

## Notes

- `trackNetwork()` **must** be called before `cy.visit()`; intercepts registered after navigation miss the initial page-load requests.
- `resetState()` in live mode is a **no-op** (with a log line) when `LIVE_RESET_COMMAND` is unset in `.env` — specs will run against whatever state the DB happens to be in.
- The `visit` overwrite marks the *outgoing* window rather than stamping the incoming one because `onBeforeLoad` only fires for Cypress-initiated loads, not for app-internal navigations or `cy.reload()`.
- `cy.exec` defaults to `failOnNonZeroExit: true`, so a failed live-reset seed already fails the test without an extra assertion.
- `E2E_ACCOUNTS` is imported but its specific usage is delegated to the `loginAs` and `demoEmailTo` implementations (truncated in the visible content).
