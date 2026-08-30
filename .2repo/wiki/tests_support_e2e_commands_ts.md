# tests/support/e2e/commands.ts

## Purpose

Central registry of all custom Cypress commands for the E2E test suite. It defines the shared vocabulary (`resetState`, `loginAs`, `navigateTo`, `settleNetwork`, `compareSnapshot`, `checkPageA11y`, etc.) that every spec in `tests/e2e/specs/` relies on, abstracting away profile differences (demo vs. live), backend reset mechanics, and navigation details so specs stay declarative and profile-agnostic.

## Key elements

- **`DemoOutboxEmail`** (exported interface) – mirrors the backend's demo-outbox email shape; used as the return type of `cy.demoEmailTo()`.
- **Timeout constants** – `DEMO_RESET_TIMEOUT_MS` (30 s), `APP_READY_TIMEOUT_MS` (15 s), `LIVE_RESET_TIMEOUT_MS` (60 s); tune reset/app-ready waits per environment.
- **`resetState()`** – dispatches to either `POST /__demo/reset` (demo) or `cy.exec(LIVE_RESET_COMMAND)` (live) depending on the `liveProfile` env flag.
- **`loginAs(role?)`** – performs the real UI login flow for `'user'` (default) or `'admin'`, pulling credentials from `E2E_ACCOUNTS`.
- **`trackNetwork()` / `settleNetwork()`** – paired helpers; `trackNetwork` must be called *before* `cy.visit()` to intercept mount-time requests; `settleNetwork` waits for two consecutive idle polls.
- **`freezeForVisual(isoTime?)`** – freezes clock, animations, caret, and dev-server overlay before a screenshot.
- **`compareSnapshot(name)`** – screenshots the viewport and diffs against `__snapshots__/` next to the spec; creates the baseline on first run.
- **`checkPageA11y(context?)`** – runs axe; fails on `serious`/`critical` violations, logs the rest.
- **`skipUnlessLive()` / `skipUnlessDemo()`** – conditional `it` skips tied to the active profile.
- **`demoEmailTo(address)`** – returns the newest demo outbox email for a recipient; fails when none exists.
- **`navigateTo(path)` / `navigateViaMenu(menu, path)`** – follow icon-only nav entries by their `href` (locale-prefixed path), avoiding translated labels as selectors.
- **`logout()`** – ends the session through the account menu.
- **`visit` overwrite** – stamps the *outgoing* window with `_supersededByVisit = true` before navigation so the app-ready guard can distinguish a fresh document from the stale one, preventing assertions (screenshots, `cy.document()`) from resolving against the previous page.
- **`window:before:load` hook** – injects `__E2E_API_URL` on every load (including `cy.reload()` and SPA navigations) so the axios client in a shared bundle targets the correct shard's backend.
- **`before` hook** – captures `apiUrl` via `cy.env()` into a module-level variable (required because `allowCypressEnv: false` makes `Cypress.env()` unavailable in event handlers).

## Relationships

- **`tests/support/e2e/accounts.ts`** – source of `E2E_ACCOUNTS` consumed by `loginAs` and any spec needing role credentials.
- **`cypress.config.ts`** – sets `allowCypressEnv: false`, which is why this file reads config exclusively through the stateful `cy.env()` API and captures values in a `before` hook.
- **`tests/e2e/specs/`** – the primary consumer; every spec calls these commands as its only interaction surface.
- **`tests/e2e/visual/visual.cy.ts`** – depends on `freezeForVisual`, `compareSnapshot`, and the `visit` overwrite to produce deterministic, correct-window screenshots.
- **`tests/support/e2e/a11y-sweep.ts` / `a11y-task.ts`** – invoke `checkPageA11y` and `navigateTo`/`navigateViaMenu` to walk routes.
- **`tests/support/e2e/e2e.ts`** – top-level support file that imports this module so the commands are registered for every spec.
- **`package.json`** – defines the `test:e2e`, `test:e2e:live`, and shard scripts whose env flags (`liveProfile`, `LIVE_RESET_COMMAND`) gate the profile-specific branches in `resetState` and the skip helpers.
- **`scripts/paired-backend-path.ts`** – sets up the paired-backend topology that the `__E2E_API_URL` injection (shard isolation) supports.

## Notes

- **Call order matters for `trackNetwork`**: it must precede `cy.visit()`; registering the intercept after navigation silently misses mount-time XHRs, and `settleNetwork` then resolves immediately (false idle).
- **`visit` overwrite is load-order sensitive**: it relies on the `_supersededByVisit` flag living on the *outgoing* window. If the app is loaded by a mechanism other than `cy.visit` (e.g., `window.location.assign` from app code), the flag is absent and the guard treats that window as fresh — correct behavior, but worth knowing when debugging "the page looks right but the screenshot is of the old page."
- **`allowCypressEnv: false`** is a project-wide security/convention choice; any new command that needs env values must use `cy.env()` (stateful) rather than `Cypress.env()`, and must capture values in a hook if the read needs to happen inside an event callback.
- **Live profile without `LIVE_RESET_COMMAND`** does *not* fail — it logs a warning and proceeds. Specs that assume a clean seed will fail later and elsewhere, so the warning in the Cypress log is the only signal.
- **Navigation selectors are `href`-based, not label-based**, because the desktop bar is icon-only; the visible text is a translated tooltip/`aria-label` that changes with locale.
