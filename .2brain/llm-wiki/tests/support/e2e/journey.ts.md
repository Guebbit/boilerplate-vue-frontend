---
source: tests/support/e2e/journey.ts
sha256: 8b2badc89c8dc217ae26e30ac7ce44753a28194214fb37e11924cb98933088d4
signature: 44da321bd564bffb08d77dc6424615b63f66a0c17dd4e001c62fb5560fa2de75
generated_at: 2026-11-10T07:32:07.869356+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/journey.ts

## Purpose

Defines the custom Cypress commands that a "journey" spec (one long `it` walking an entire user story) is built from: naming phases, moving the demo backend's clock, running background jobs, and small browser-side aids. It exists so that a failure in a 30-step journey reports *which step* broke, and so that time-sensitive or background-job logic can be exercised deterministically.

## Key elements

- **`cy.step(name)`** — Logs a bold phase name and sets `currentStep`; the name is later stamped onto any failure message via the `Cypress.on('fail')` hook. Uses `cy.then` to assign `currentStep` so Cypress's queue semantics keep each step name correct.
- **`cy.travel(ms)`** — `POST`s to the demo backend's `/__test/clock` to advance server time, then calls `cy.task('forgetAdminTokens')` so stale staff sessions are re-authenticated on next use. Rejects if `liveProfile` is true.
- **`cy.runJob(name)`** — `POST`s to `/__test/jobs/:name` on the demo backend. On 404 it fetches `GET /__test/jobs` and lists the available names in the error. Yields `{ job, result }`.
- **`cy.travelEverywhere(ms)`** — Calls `cy.travel(ms)` first, then advances (or installs on first use) a Date-only `cy.clock` so the browser's `Date`-based logic moves with the server.
- **`cy.grantClipboard()`** — Grants `clipboardReadWrite` + `clipboardSanitizedWrite` via the Chrome DevTools Protocol (`Browser.grantPermissions`), scoped to the `baseUrl` origin. Chromium-family browsers only; call after `cy.visit()`.
- **`cy.stubWindowOpen()`** — Replaces `window.open` on the current window with a sinon stub aliased `@windowOpen`. Must be called again after a full page reload.
- **`Cypress.on('fail')`** — Prefixes the error message with the current step name (via `prefixWithStep`) before re-throwing.
- **`beforeEach` hooks** — Reset `currentStep` and `browserClock` so state never leaks between tests.

## Relationships

- **`tests/support/stub.ts`** — Imports `asStub`, a typing shim that makes a `.then()` callback returning nothing produce `Chainable<void>` instead of the default "subject unchanged" inference. Every command in this file is wrapped with it.
- **`scripts/e2e/step-prefix.ts`** — Imports `prefixWithStep`, used inside the `Cypress.on('fail')` handler to prepend `[step: <name>]` to the failure message.
- **`tests/support/e2e/e2e.ts`** — The broader E2E support entry point that loads this file (along with other support files) into every spec's run context.

## Notes

- `cy.step` must use `cy.then` (not a plain assignment) to set `currentStep`; Cypress queues all commands before executing them, so a direct assignment would leave every step labelled with the *last* name.
- `cy.travel` does **not** move the browser's own clock. Use `cy.travelEverywhere` or `cy.clock` separately when the page computes deadlines client-side.
- A `travel` or `travelEverywhere` jump past one day invalidates a `loginAs` session; a staff/admin session also expires after 30 minutes idle. Re-sign in after any long jump.
- `cy.grantClipboard` is CDP-based and requires a Chromium-family browser; it must come after `cy.visit()` so the origin is resolvable.
- `cy.stubWindowOpen` lives on the *current* `window` object; a full navigation or reload replaces it.
- `runJob` name convention: colons in declared job names are written as hyphens (`sweep:reservations` → `sweep-reservations`).
