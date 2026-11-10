---
source: tests/support/e2e/e2e.ts
sha256: 82ca4a66e84b64f381f951721002bec7a46d31dc3b28d6755e3fddb07ea9a4bf
signature: 82ca4a66e84b64f381f951721002bec7a46d31dc3b28d6755e3fddb07ea9a4bf
generated_at: 2026-11-10T07:29:21.315840+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/e2e.ts

## Purpose

Cypress support entry point for the e2e suite. It is auto-loaded before every spec file and is responsible for registering third-party plugins, importing all local test-helper modules, configuring global error handling, and establishing a clean per-test starting state.

## Key elements

- **Plugin imports** — `cypress-axe` (accessibility assertions), `cypress-real-events` (real CDP-driven keystrokes/touch), `@cypress/grep` (tag-based test filtering via `it(…, { tags: '@smoke' })`).
- **Local module imports** — `./scenario`, `./commands`, `./fixtures`, `./journey`, `./touch`, `./design-capture`, `./layout-checks`; importing each file registers its custom `cy.*` commands or side-effects globally.
- **`registerCypressGrep()`** — activates tag filtering; the config is exposed in `cypress.config.ts`.
- **`Cypress.on('uncaught:exception')` handler** — swallows only the benign `ResizeObserver loop completed with undelivered notifications` error (triggered by Vuetify menus inside dialogs); all other uncaught errors still fail the test.
- **`beforeEach` hook** — clears cookies, sets `analyticsConsent` to `'denied'` (prevents the Umami consent banner from shifting layout and visual baselines), and clears all session storage.

## Relationships

- Imports (and therefore initialises) every other file in `tests/support/e2e/`: `commands.ts`, `design-capture.ts`, `fixtures.ts`, `journey.ts`, `layout-checks.ts`, `scenario.ts`, `touch.ts`. This file is the single wiring point; none of those modules are imported directly by spec files.

## Notes

- `cypress-real-events` is imported specifically so that `cy.realPress('Tab')` moves DOM focus the same way a user's Tab does; Cypress's native `.type('{tab}')` does not.
- The `analyticsConsent` cookie is set to `'denied'` by default so visual-regression baselines stay stable. A spec that tests the consent flow itself is expected to clear or override this cookie.
- The ResizeObserver suppression is narrow: the handler checks the error *message string*, so any other `ResizeObserver`-related failure would still propagate.
