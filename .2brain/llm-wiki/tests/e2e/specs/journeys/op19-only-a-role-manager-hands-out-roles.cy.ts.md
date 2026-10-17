---
source: tests/e2e/specs/journeys/op19-only-a-role-manager-hands-out-roles.cy.ts
sha256: 177a83f8647f3c847a60f5aac5673484e355e196643de8a60af43decdf65ef95
generated_at: 2026-10-17T02:20:21.675649+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op19-only-a-role-manager-hands-out-roles.cy.ts

## Purpose

Cypress E2E journey test for OP19 ("Only a role manager hands out roles"). Verifies the permission rule that assigning or revoking a staff role requires the `assign:Role` capability, held only by the administrator. It covers both the negative path (moderator/support UI disables the role picker; server returns 409 on a manual PATCH) and the positive path (admin promotes a seeded `unverified` customer to `warehouse`; the promoted user's next session shows the inventory menu; the grant is recorded in the audit trail). A second story confirms a moderator cannot demote an admin (UI hides edit controls; server returns 403).

## Key elements

- **`UserLike` / `AuditRowLike`** – Minimal structural interfaces the test reads; not exported.
- **`adminMenuLinks()`** – Opens the `[data-test=admin-menu]`, collects all `<a>` hrefs from the resulting `role=menu`, closes the menu with Escape, and yields the href array as a `Cypress.Chainable<string[]>`.
- **`grantRole(userId, role)`** – Visits the user page, intercepts the PATCH, clicks through the access dialog to pick and confirm a role, and waits for the response.
- **`roleIs(userId, role)`** – Asserts via `cy.apiAs` (as admin) that the API-reported `role` equals the expected value (`undefined` for a plain customer).
- **`noRoleOffered(userId, role, as)`** – Verifies the role `<select>` is disabled in the UI, then issues a raw `PATCH` via the seeded device and expects HTTP 409; finally asserts the role is still `undefined`.
- **`describe` block (2 tests)** – The two `it` blocks: (1) moderator & support are refused, admin promotes to warehouse, audit trail confirms; (2) moderator cannot demote an admin (no edit controls, server 403).

## Relationships

- **`tests/support/e2e/steps.ts`** – Imports `eventually`, a polling helper used to wait for the audit-trail row to appear (eventual consistency).
- **`tests/support/e2e/harness.ts`** – Imports `loginDevice` and `requestAsDevice`, which authenticate a seeded account and issue a raw API request (used for the 409/403 negative checks).
- **`tests/support/e2e/scenario.ts`** – Imports the `E2ERole` type, used as the `as` parameter in `noRoleOffered` to name the seeded account making the request.

## Notes

- The `// requires-module: account, inventory, users` header comment declares which backend modules must be active for this test to run; the test runner likely gates on this.
- `beforeEach` calls `cy.restore()` to reset seeded state, then re-visits `/en`.
- The distinction between **409** (role-picker conflict – you lack `assign:Role`) and **403** (cannot even attempt to modify an admin) is intentional; a change in either status code should update the test.
- `roleIs` uses `undefined` (not `null`) to represent "no role assigned," matching the API's omission of the field for plain customers.
- `adminMenuLinks` closes the menu with `{esc}` before returning; callers should not assume the menu stays open.
- The test relies on custom Cypress commands (`cy.accountInRole`, `cy.loginAs`, `cy.switchUser`, `cy.apiAs`, `cy.step`, `cy.pickOption`) that are registered by the support files rather than defined here.
