---
source: src/modules/products/tests/e2e/leave-guard.cy.ts
sha256: 3f7a231232aaff9f14046c95554944526563f64f94775c8f9f84d1dbf78e5880
signature: b86a93bf9b9f20828c881dc34ec37acf3dab3bad21e6a2f90d15da82f41caea3
generated_at: 2026-11-10T05:22:55.290503+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/e2e/leave-guard.cy.ts

## Purpose

Cypress E2E spec that verifies the leave-guard on the product edit form: an unsaved (half-typed) price must prompt a Stay/Leave dialog before a menu-link navigation discards it, while a form that has just been saved navigates away silently. It exists to prevent regressions where in-app routing accidentally drops user input without confirmation.

## Key elements

- **`TYPED_PRICE`** (`'41.50'`) — the price value entered into the form during each test.
- **`clickAboutLink()`** — helper that clicks the visible `nav a[href="/en/about"]` link, triggering an in-app router navigation (not a full page load).
- **`describe('a half-typed product form asks before it is thrown away')`** — top-level suite containing two tests:
  - *Stay keeps the typed price, Leave navigates* — types a price, triggers the dialog via `clickAboutLink`, asserts Stay (`app-dialog-cancel`) preserves the value and URL, then asserts Leave (`app-dialog-confirm`) lands on `/en/about`.
  - *a form that was just saved leaves without asking* — types a price, intercepts the `PATCH` save (expects 200), then clicks the about link and asserts no dialog appears and the pathname is `/en/about`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Relies on several **custom Cypress commands** not part of the default API: `cy.subjectId`, `cy.loginAs`, `cy.restore`, `cy.step`. These must be defined in the shared support files for the spec to run.
- `beforeEach` uses a **double-visit pattern** (`cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')`) to establish a clean authenticated state before each test.
- All selectors use `data-test` attributes (e.g. `data-test=product-price-field`, `data-test=app-dialog`), so the test is coupled to those attributes being present in the rendered DOM.
- The `about` page is intentionally chosen because it is **shell-owned**, guaranteeing it exists regardless of which product modules are included in a given build.
- The save test intercepts `PATCH **/products/${productId}`; if the endpoint shape changes, this test breaks.
