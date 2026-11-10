---
source: src/modules/account/tests/e2e/actions.cy.ts
sha256: 14808d639633c62853e221d2fd3b70038b7aea74dea4f641ba4fa41197b725b1
signature: 14808d639633c62853e221d2fd3b70038b7aea74dea4f641ba4fa41197b725b1
generated_at: 2026-11-10T03:32:13.662885+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/actions.cy.ts

## Purpose

E2e failure-path tests for the account module's address actions. Each case injects a server fault on the relevant HTTP call, verifies the page surfaces the expected alert, preserves any user-typed state, and confirms a retry succeeds once the stub is removed. All cases are driven by the shared `actionTable` runner rather than individual `it()` blocks.

## Key elements

- **`actionTable('account', [...])`** — Registers the account module's failure rows with the shared runner. The array contains two case objects:
  - **Address removal failure** (`kind: 'row'`) — Clicks `[data-test=address-remove]`, confirms the dialog, intercepts `DELETE /account/addresses/*`. Asserts the alert `address-row-action-error` with message "The removal failed" and that the `[data-test=address-item]` row is still listed.
  - **Address save failure** (`kind: 'dialog'`) — Opens the add-address dialog, fills all fields including the country autocomplete, then clicks `[data-test=address-save]`. Intercepts `POST /account/addresses`. Asserts alert `address-save-error`, keeps the dialog open, and verifies field values persist (except the country search text, per `valuesNotCompared`).

## Relationships

- **`tests/support/e2e/action-table.ts`** — Provides the `actionTable` function that this file imports. The runner is responsible for stubbing the intercept, invoking `trigger`/`prepare`, asserting the alert and state, removing the stub, and re-invoking the trigger to confirm success. This file only supplies declarative case descriptors.

## Notes

- `kind: 'row'` vs `kind: 'dialog'` signals to the runner which post-failure invariants to check (listed row still present vs. dialog still open with values intact).
- `valuesNotCompared` documents that the country autocomplete intentionally clears its search text after a selection, so the runner skips that field during the "values preserved" assertion.
- The `operation` field in `intercept` is an OpenAPI-style operation path; it is metadata for the runner (e.g., logging or reporting) and does not affect the actual URL matching, which is driven by `method` + `url`.
- Persona is always `'user'` and the route is `/en/profile`; the runner uses these to log in and navigate before each case.
