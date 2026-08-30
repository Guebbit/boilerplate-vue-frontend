# tests/support/e2e/e2e.ts

## Purpose

Cypress global support file, automatically loaded before every e2e spec. It wires up third-party plugins (a11y, real keyboard events), registers custom commands and fixtures, and applies a shared `beforeEach` reset so tests start from a clean state.

## Key elements

- **`import 'cypress-axe'`** – Enables the `cy.checkA11y()` command for accessibility auditing in specs.
- **`import 'cypress-real-events'`** – Provides `cy.realPress()` and related APIs that dispatch keystrokes through the Chrome DevTools Protocol, producing real focus/keyboard behavior (e.g., Tab moving focus) that Cypress's built-in `.type('{tab}')` cannot simulate. Required for specs like `keyboard.cy.ts`.
- **`import './commands'`** – Loads custom `cy.*` commands defined in the commands module.
- **`import './fixtures'`** – Registers additional test fixtures.
- **`beforeEach` hook** – Calls `cy.clearCookies()` and `cy.clearAllSessionStorage()` so no state leaks between tests.

## Relationships

- **tests/support/e2e/commands.ts** – Imported here; this file is the single entry point that activates all custom Cypress commands project-wide.
- **tests/support/e2e/fixtures.ts** – Imported here; same role for fixture registration.

## Notes

- This file is not imported by specs directly—Cypress loads it automatically (controlled by the `supportFile` config option). Remove or rename it in config and the whole setup breaks.
- The `beforeEach` reset is unconditional; if a test intentionally depends on persisted cookies or session storage it must re-establish that state after the hook runs.
- `cypress-real-events` is pulled in solely for `cy.realPress()`; if that capability is ever dropped, the import (and its peer dependency) can be removed.
