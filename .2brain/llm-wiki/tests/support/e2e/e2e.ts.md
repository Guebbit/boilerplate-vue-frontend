---
source: tests/support/e2e/e2e.ts
sha256: 5b3c56b375ec0b7532d43af829afafc481de8694495d81aba2b42db146997620
generated_at: 2026-10-17T02:24:58.695123+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/e2e.ts

## Purpose

Cypress support file, auto-loaded before every e2e spec. It registers third-party plugins, imports the project's local support modules, installs a narrow uncaught-exception filter, and seeds a `beforeEach` hook that resets browser state and pre-denies analytics consent so tests run under a clean, deterministic baseline.

## Key elements

- **`import 'cypress-axe'`** — makes the `cy.checkA11y()` accessibility commands available.
- **`import 'cypress-real-events'`** — adds `cy.realPress()`, `cy.realClick()`, etc. Keystrokes are dispatched through the Chrome DevTools Protocol so a real Tab actually moves focus (Cypress' built-in `.type('{tab}')` is simulated and does not).
- **`registerCypressGrep()`** (from `@cypress/grep`) — enables tag-based test filtering, e.g. `it('…', { tags: '@smoke' })`. The `expose` config lives in `cypress.config.ts`.
- **`import './scenario' | './commands' | './fixtures' | './journey'`** — pulls in the project's local support modules (custom commands, fixtures, scenario/journey helpers).
- **`Cypress.on('uncaught:exception', …)`** — returns `false` (suppresses failure) *only* when the error message contains `"ResizeObserver loop"`. Every other uncaught error still fails the test. This guards against a benign Chromium/Vuetify layout-settling warning.
- **`beforeEach(…)`** — clears cookies, sets `analyticsConsent` to `"denied"`, and clears all session storage, so each test starts with no analytics banner and no stale state.

## Relationships

- **`tests/support/e2e/commands.ts`** — imported; extends the `cy` namespace with project-specific commands.
- **`tests/support/e2e/fixtures.ts`** — imported; provides reusable page/element fixtures.
- **`tests/support/e2e/journey.ts`** — imported; supplies journey-level test helpers.
- **`tests/support/e2e/scenario.ts`** — imported; supplies scenario-level test helpers.

All four are side-effect imports (no named bindings); their exports attach to the global `cy` / `Cypress` objects.

## Notes

- The `beforeEach` cookie (`analyticsConsent=denied`) is a deliberate neutral default. A spec whose *subject* is the consent banner must clear or override this cookie explicitly.
- The ResizeObserver filter is intentionally narrow — it matches a single message substring. A real regression that happens to contain that string would be silently swallowed; in practice the message is unique to that platform warning.
- The file must remain a single support entry point; the `supportFile` key in `cypress.config.ts` points here. Reordering or removing the plugin imports changes the available `cy.*` surface for every spec.
