---
source: tests/e2e/specs/journeys/at9-the-platform-operator-is-not-the-shop.cy.ts
sha256: a6e2a3369acc5c15255ad053355c650f1abb1e346eb01610b5b56125a8dcf19c
generated_at: 2026-10-17T02:08:47.129055+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at9-the-platform-operator-is-not-the-shop.cy.ts

## Purpose

Cypress e2e journey test verifying that the **operator** role is confined to platform pages (admin, realtime) and is redirected home with a notice when accessing shop pages (users, audit, inventory), while the **root** user (who doubles as administrator) sees and can reach both halves.

## Key elements

- **`adminMenuLinks(): Cypress.Chainable<string[]>`** – Clicks `[data-test=admin-menu]`, collects all `[role=menu] a` hrefs, presses Escape to close the menu, and returns the list of hrefs wrapped in a `Cypress.Chainable`.
- **`isTurnedBack(path: string): void`** – Visits the given locale-prefixed path and asserts the router redirected to `/en` (`#home-page` exists) and that a `.v-alert` notice is rendered.
- **`describe('AT9 · …')`** – The single test suite. `beforeEach` restores state via `cy.restore()` and re-visits `/en`.
- **Single `it(…)` block** – Four `cy.step` sections: (1) operator's menu contains platform pages but not shop pages, (2) platform pages render, (3) shop pages trigger `isTurnedBack`, (4) after `cy.switchUser('admin')` both platform and shop pages are present and reachable.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `// requires-module: account, observability, users` comment at the top signals which server modules must be active for this test to run; it is a convention used by the test runner, not a runtime import.
- `beforeEach` performs a **double visit** (`cy.visit → cy.restore → cy.visit`) to ensure a clean state before each scenario.
- `adminMenuLinks` suppresses its `cy.wrap` log with `{ log: false }` to keep the command log uncluttered.
- The test relies on `cy.loginAs` / `cy.switchUser` commands (defined elsewhere in the e2e support layer) and on `cy.step` for structured step reporting.
- Shop pages checked for exclusion: `/users`, `/audit`, `/inventory`, `/products`, `/locales`. Only `/users`, `/audit`, `/inventory` are exercised via `isTurnedBack`; `/products` and `/locales` are asserted absent from the menu but not visited.
