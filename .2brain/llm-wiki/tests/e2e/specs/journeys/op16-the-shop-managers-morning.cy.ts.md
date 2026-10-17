---
source: tests/e2e/specs/journeys/op16-the-shop-managers-morning.cy.ts
sha256: 3b6188697b12624513a324854717a5d38bdda0bae2bfc84cf5bace74258839eb
generated_at: 2026-10-17T02:19:38.281123+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op16-the-shop-managers-morning.cy.ts

## Purpose

E2E Cypress journey (OP16) that verifies the **manager** role sees and can use exactly the shop-operations surface (orders, returns, inventory read, feedback read, product pricing) while every admin/platform control is absent or disabled. It also confirms the manager retains customer capabilities (basket, add-to-cart) and that a price change is immediately visible to a guest.

## Key elements

- **`adminMenuLinks()`** – Opens the `[data-test=admin-menu]` dropdown, collects every `[role=menu] a` href, dismisses the menu with `{esc}`, and yields the array as a `Cypress.Chainable<string[]>`.
- **`isTurnedBack(path)`** – Visits a locale-prefixed URL the role must not access; asserts the app redirects to `/en` (Home) and that a `.v-alert` notification is visible.
- **`NEW_PRICE`** (`'31.40'`) – The price the manager types into the product-edit form during the repricing step.
- **`describe('OP16 · The shop manager's morning')`** – Single spec with a `beforeEach` that restores fixture state, and one `it` block that walks through eight `cy.step` checkpoints (menu links, basket, paid-order workflow, cancel-only order, return approval, inventory read-only, feedback read-only, reprice-and-verify-as-guest).

## Relationships

No graph neighbors are recorded for this file. It depends on shared Cypress fixtures/commands (`cy.restore`, `cy.loginAs`, `cy.apiAs`, `cy.subjectId`, `cy.step`) provided by the project's support utilities, but those are not tracked as file-level dependencies.

## Notes

- The `beforeEach` calls `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')`. The double visit ensures a clean SPA shell before fixture restoration; omitting the first visit can cause restore to hit a stale component state.
- The repricing step explicitly waits for the price input to be non-empty before clearing it (`should('not.have.value', '')`). Saving before the async fetch resolves would submit an empty price.
- The test uses `cy.apiAs('admin', …)` to create a feedback ticket as a precondition, then switches back to the manager view—do not assume all API calls run as the manager.
- `requires-module` header lists: account, api-keys, feedback, inventory, orders, products, returns. The test asserts *absence* of API-keys and account (Users) UI for the manager.
