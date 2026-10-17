---
source: tests/support/e2e/journey.ts
sha256: 5256a5fbea9a29ec9569df9d48ec019e9cd7bdea7ed7074926cc1a7bd3833ab6
generated_at: 2026-10-17T02:26:14.220733+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/journey.ts

## Purpose

Extends the global Cypress namespace with four custom commands (`step`, `travel`, `grantClipboard`, `stubWindowOpen`) purpose-built for long, multi-phase "journey" specs. It also hooks `Cypress.on('fail')` so that every failure message is automatically prefixed with the current step name, making CI output pinpoint *where* in a story a test broke.

## Key elements

- **`cy.step(name)`** — Starts a named phase: logs a bold line in the command log and sets the module-level `currentStep` (via a queued `cy.then` so it fires at execution time, not queue-build time). The name is later stamped onto failure messages.
- **`cy.travel(ms)`** — POSTs `{ advanceMs: ms }` to the demo backend's `__test/clock` endpoint. Guards against non-demo (`liveProfile === true`) and rejects negative values by contract.
- **`cy.grantClipboard()`** — Sends a `Browser.grantPermissions` CDP command (Chromium-only) to allow clipboard read/write for the app origin. Must be called after `cy.visit()`.
- **`cy.stubWindowOpen()`** — Replaces `window.open` with a Sinon stub aliased `@windowOpen` on the current window. Must be re-applied after a full page reload.
- **`currentStep`** — Module-scoped `string | undefined`; reset to `undefined` in `beforeEach` so it never leaks across tests.
- **`enterStep(name)`** — Internal helper that wraps the assignment in `cy.then` to respect Cypress's command-queue semantics.
- **`Cypress.on('fail', …)`** — Prefixes `error.message` with the current step (via `prefixWithStep`) and rethrows.

## Relationships

- **`scripts/e2e/step-prefix.ts`** — Provides `prefixWithStep(message, step)` used by the `fail` handler to produce the `[step: …]` prefix.
- **`tests/support/stub.ts`** — Provides the `asStub` type helper; wraps each command callback so a `.then()`-returning-nothing is typed as `Chainable<void>` rather than "subject unchanged."
- **`tests/support/e2e/e2e.ts`** — The primary e2e support file (likely defines `cy.skipUnlessDemo()` and other shared setup); `journey.ts` is its companion for story-shaped tests.
- **`src/modules/cart/tests/guest-cart.property.spec.ts`** / **`src/modules/inventory/tests/opening-stock-field.spec.ts`** — Consumer specs that rely on the journey commands (`step`, `travel`, `stubWindowOpen`) to structure their multi-phase assertions.

## Notes

- **Queue vs. call-time:** `currentStep` is assigned inside `cy.then`, not at call time. A plain `currentStep = name` at the top of the command body would fire during Cypress's queue-building phase and every step would end up named after the *last* one.
- **`asStub` typing seam:** Without it, a callback that returns a `cy.then(…)` chain types as "subject unchanged" rather than `Chainable<void>`. The same pattern is used in `commands.ts`.
- **`cy.travel` is demo-only:** It throws if `liveProfile` is true. The browser's own clock is *not* touched — use `cy.clock` for client-side time comparisons. A jump past 7 days invalidates the session (refresh-token lifetime).
- **`cy.grantClipboard` is Chromium-only** and is origin-scoped; calling it before `cy.visit()` grants the wrong origin.
- **`cy.stubWindowOpen` is window-scoped:** a full page reload replaces `window`, so the stub must be re-applied.
- **`fail` handler must rethrow:** omitting `throw error` silently swallows the failure.
