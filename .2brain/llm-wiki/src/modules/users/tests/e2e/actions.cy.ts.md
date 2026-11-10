---
source: src/modules/users/tests/e2e/actions.cy.ts
sha256: 48a5ea493ede9c66d3fd01d7527e32a1dbb0a989db59302552c922a1eea08310
signature: cc10da89ff0d22b1d8a26d9bc00d2da87c96f8345b47aa669607c8621dee0344
generated_at: 2026-11-10T06:05:28.049178+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/e2e/actions.cy.ts

## Purpose

End-to-end fault-tolerance tests for the users module. It feeds four scenario definitions into the shared `actionTable` runner, which drives each one through a scripted server failure and asserts that the UI shows the expected alert, preserves any typed input, and succeeds on retry once the stub is removed.

## Key elements

- **`unique()`** — local helper that returns a timestamp+random string so user fixtures don't collide across parallel spec runs on a shared backend.
- **`actionTable('users', [...])`** — the single exported call (module has no named exports). Passes four case objects to the shared runner:
  - *create* (`kind: 'form'`): types email/username, submits, expects alert `user-create-submit-error`.
  - *edit* (`kind: 'form'`): creates a user via API in `route`, appends `-edited` to the username field, submits, expects `user-edit-submit-error`.
  - *delete* (`kind: 'row'`): clicks the first row's delete button and confirms the dialog, expects `users-list-row-action-error`; asserts the row is still listed via `[data-test=list-row]`.
  - *slow read* (`kind: 'slow'`): intercepts a `GET` with delay, types into the username field before the response lands, asserts the form stays closed until the record loads and the typed value survives a refetch.

Each case specifies `persona`, `route` (static or factory), `prepare`, `trigger`, and `intercept` (method / url glob / OpenAPI operation path).

## Relationships

- **`tests/support/e2e/action-table.ts`** — provides the `actionTable` function imported at the top. This file is purely a data definition; all orchestration (intercept wiring, assertion sequence, retry pass) lives in that runner.

## Notes

- The file has no test runner of its own (`describe`/`it`); the `actionTable` runner expands each object into its own spec.
- The **edit** case builds its route asynchronously (creates a user via `cy.apiAs`), so `route` is a function, not a string.
- The **slow** case depends on `cy.accountInRole('user')` being available globally (defined elsewhere in the e2e support layer).
- `intercept.url` values use Globs (`**/users`, `**/users/*`); `operation` records the OpenAPI operation path for traceability.
