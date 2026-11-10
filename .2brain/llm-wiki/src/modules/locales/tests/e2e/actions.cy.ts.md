---
source: src/modules/locales/tests/e2e/actions.cy.ts
sha256: 2fda35bd5cc5eb066432c45656fc3d735e81d86a647c8a3c2c0d4bfe266b3710
signature: 2fda35bd5cc5eb066432c45656fc3d735e81d86a647c8a3c2c0d4bfe266b3710
generated_at: 2026-11-10T04:42:36.528012+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/tests/e2e/actions.cy.ts

## Purpose

E2e test that exercises the failure-and-retry path of the locales (languages) page: when a registration or deletion request is answered with a server fault, the form/row is preserved, an error alert appears, and a subsequent retry succeeds. It delegates all assertion mechanics to the shared `actionTable` runner so the page only declares *what* to set up and *what* to check.

## Key elements

- **`actionTable('locales', [ … ])`** — Top-level call that registers two scenario objects with the shared runner:
  - *Failed registration* (`kind: 'dialog'`) — Prepares the language-create form (types tag `de`, name `German`, native name `Deutsch`), triggers save, intercepts `POST **/locales`, then asserts the form dialog stays open, the `language-form-error` alert is visible, and the save control remains interactive.
  - *Failed delete* (`kind: 'row'`) — Triggers delete on the `ja` row, confirms the app dialog, intercepts `DELETE **/locales/*`, then asserts the row stays listed and the `locales-list-delete-error` alert is visible.
- Both scenarios use persona `editor` and route `/en/locales`.

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` function imported at the top of this file. The runner interprets each scenario object (prepare, trigger, intercept, kind, alert, dialog/row, control) and performs the fault injection, UI assertions, and retry cycle generically. This file supplies no logic of its own beyond the two scenario declarations.

## Notes

- The delete scenario is deliberately pinned to the `ja` row (`[data-language=ja]`) so it never targets a live seeded language that other tests may depend on.
- Selectors follow the `data-test` / `data-language` convention used across the locales UI; no class-name or XPath selectors are used here.
- The `intercept.operation` field (`/locales` vs `/locales/{locale}`) identifies *which* API call the runner should fault, distinguishing the two scenarios even though both hit the `/en/locales` route.
