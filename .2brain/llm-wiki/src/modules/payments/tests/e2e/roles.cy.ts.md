---
source: src/modules/payments/tests/e2e/roles.cy.ts
sha256: 22af50b8690983f56dd5e6eb7c9c9354fa21a387484ce143ad23a72eeb868b9b
signature: 22af50b8690983f56dd5e6eb7c9c9354fa21a387484ce143ad23a72eeb868b9b
generated_at: 2026-11-10T05:14:21.667470+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/roles.cy.ts

## Purpose

Declares the role-sweep case list for the payments module. It tells the shared `sweepRoles` helper which routes, page landmarks, and buttons each persona must be able to reach, and which permission keys gate each. Co-located under the payments module so that deleting the module automatically removes its sweep.

## Key elements

- **`sweepRoles('payments', [ … ])`** — single call that registers one case for the payments page. The first argument is a module tag; the array is the list of cases to sweep.
- **Case `payments`** — the sole entry:
  - `route` — the URL under test (`/en/sales/payments`).
  - `can` — permission keys the persona must hold to see the page at all (`display`, `Payment`).
  - `menuHref` — expected navigation target for the menu entry.
  - `pageRoot` — selector (`#payments-list-page`) identifying the rendered page.
  - `buttons` — list of interactive elements the persona must be able to act on; here a single `[data-test=order-reference-search]` button gated by `create` + `Payment`.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` helper. This file imports it and passes a static case array; all persona iteration, permission-checking, and browser assertions live in the helper. This file contributes only the data (selectors, permission keys, routes).

## Notes

- The file exports nothing. It is a side-effect module: running it under Cypress triggers the sweep via the top-level `sweepRoles` call.
- To add a new page or button to the payments sweep, append to (or extend) the existing case array—do not create a second `sweepRoles` call.
- Permission keys in `can` / `buttons[].can` are matched against whatever persona/role fixture the sweep helper loads; typos here will silently skip or fail the check.
