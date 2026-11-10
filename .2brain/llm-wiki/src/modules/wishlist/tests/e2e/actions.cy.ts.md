---
source: src/modules/wishlist/tests/e2e/actions.cy.ts
sha256: 48a48f3ba455d9d0badc9520a568564b27c18c18644525781cb62054d9c73a6d
signature: 48a48f3ba455d9d0badc9520a568564b27c18c18644525781cb62054d9c73a6d
generated_at: 2026-11-10T06:19:43.879145+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/e2e/actions.cy.ts

## Purpose

Cypress e2e spec that exercises the wishlist's **failure-recovery** flows (server fault during add/remove) through the shared `actionTable` runner. It asserts that a failed action keeps the UI element in a "listed" state, surfaces the correct error alert, and that a subsequent retry succeeds.

## Key elements

- **`actionTable('wishlist', [ … ])`** — registers two test-case objects with the shared runner; no local functions or exports are defined.
  - *Case 1 – Failed removal (DELETE):* navigates to `/en/wishlist`, clicks the first `[data-test=wishlist-remove]` button, intercepts `DELETE **/wishlist/items/*` (op `/wishlist/items/{productId}`), expects alert `wishlist-line-action-error` with message "The removal failed", and verifies `[data-test=wishlist-item]` remains listed.
  - *Case 2 – Failed save from product page (POST):* resolves a product ID via `cy.subjectId('product.barebones')`, clicks `[data-test=wishlist-toggle]`, intercepts `POST **/wishlist/items` (op `/wishlist/items`), expects alert `wishlist-toggle-error` with message "The save failed", and verifies `[data-test=wishlist-toggle]` remains listed.

Both cases use `kind: 'row'` and `persona: 'user'`.

## Relationships

- **`tests/support/e2e/action-table.ts`** — sole import. Provides the `actionTable` helper that interprets each case object (trigger, intercept, alert, listed, kind, persona, route) and drives the shared click → fail → assert → retry lifecycle. This file contributes no logic of its own beyond the two case definitions.

## Notes

- The file is a **side-effect module**: it has no exports and no test declarations of its own. All assertion and retry logic lives in `actionTable`.
- `route` may be a plain string *or* a `() => cy…` chain that resolves dynamically (case 2).
- `intercept.operation` mirrors the OpenAPI path; `intercept.url` is the glob pattern Cypress actually stubs. Keep both in sync when the API path changes.
- `cy.subjectId('product.barebones')` depends on a seed/factory convention for a known product fixture — ensure that fixture exists before running this spec.
