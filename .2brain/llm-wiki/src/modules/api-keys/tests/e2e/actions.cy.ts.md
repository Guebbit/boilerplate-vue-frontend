---
source: src/modules/api-keys/tests/e2e/actions.cy.ts
sha256: 834ce5f60c21cbb661e4a4bfae56b410ba46959204be3d6fee572e81f5394282
signature: a72f3acedd3e97be2c62ec680e2665ba28c36406f216cbb147118eb219594b87
generated_at: 2026-11-10T03:50:37.980622+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/e2e/actions.cy.ts

## Purpose

End-to-end failure-path tests for the api-keys module. It drives the shared `actionTable` runner through two scenarios—a failed key mint (create form) and a failed key revoke (list-row action)—verifying that a server fault produces the correct alert, preserves the user's typed/visible state, and that a retry once the fault is cleared succeeds.

## Key elements

- **`weekAhead()`** – local helper returning a `datetime-local` string (ISO `slice(0,16)`) for a date 7 days out, used to satisfy the required expiry field on the mint form.
- **`actionTable('api-keys', [ … ])`** – the sole top-level call. Registers two test descriptors under the `"api-keys"` group:
  - *Mint (kind: `form`)* – types name, permissions, and expiry into the create form, submits, intercepts `POST **/api-keys` with a fault, asserts alert `api-key-create-error` and preserved input.
  - *Revoke (kind: `row`)* – creates a key via `cy.apiAs` (dynamic route), clicks the first `[data-test=row-revoke]` → confirm dialog, intercepts `DELETE **/api-keys/*` with a fault, asserts alert `api-keys-list-row-action-error` and that the row is still listed (`listed` selector).

## Relationships

- **`tests/support/e2e/action-table.ts`** – provides the `actionTable` runner consumed here. The file passes declarative descriptors (name, persona, route, prepare, trigger, intercept, kind, alert, message, and optional `listed`) and the runner handles the shared steps: navigating, stubbing the fault, asserting the alert + state preservation, removing the stub, re-triggering, and asserting success.

## Notes

- The file is `@module`-only; it exports nothing. All value is in the two descriptor objects passed to `actionTable`.
- The revoke test's `route` is a **function** (returns a `Cypress.Chainable`), not a static string—needed because it must first create a key via the API before navigating.
- `kind` distinguishes how the runner checks state preservation: `'form'` implies checking that input values are still present; `'row'` implies checking the `listed` selector still matches a row.
- Intercepts use glob-style `url` patterns (`**/api-keys`, `**/api-keys/*`) plus an `operation` field, suggesting the runner matches on both.
