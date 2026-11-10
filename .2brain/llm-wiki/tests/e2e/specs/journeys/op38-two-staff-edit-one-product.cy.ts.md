---
source: tests/e2e/specs/journeys/op38-two-staff-edit-one-product.cy.ts
sha256: fd1085458c4cdfe94328c3ef3d0d96b1527fac3c1f085a549f114236cabc08de
signature: fd78c8f6b1fb8ca8d0108a2234b1474db81f639abb0ade885d0cb3edb564b1af
generated_at: 2026-11-10T07:18:04.414319+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op38-two-staff-edit-one-product.cy.ts

## Purpose

E2E test for the OP38 journey: verifying that an optimistic-concurrency guard (`If-Match` → `412`) prevents a lost update when two staff members edit the same product. It confirms the stale editor is refused, shown the conflict message, offered a "reload latest" action, and can then save on top of the admin's newer price.

## Key elements

- **`ADMIN_PRICE` / `EDITOR_PRICE`** — string constants (`'123.45'`, `'77.70'`) used as the two competing price values.
- **`publicPrice(id)`** — fetches a product's price via `GET /products/:id` on the `apiUrl` Cypress env, returning a `Cypress.Chainable<string>`. All price assertions go through this (never the form).
- **`describe('OP38 · Two staff edit one product')`** — single test:
  1. Editor opens the edit form (hydrated check on the price input).
  2. Admin patches the price via API (`cy.apiAs`).
  3. Editor submits → expects `412`, visible error, visible "reload latest" button, and that the public price is still the admin's.
  4. Editor clicks "reload latest" → form now shows admin's price.
  5. Editor types own price and saves → expects `200` and the public price updates.

## Relationships

No dependency-graph neighbors are recorded for this file.

## Notes

- The test reads every price back from the **API** (`publicPrice`), never from the form, to verify server-side truth.
- `cy.restore()` in `beforeEach` resets fixtures; the page is visited twice around it to get a clean state.
- The `cy.intercept` alias `@editorSave` is set **before** the first submit and reused for the second submit; the test relies on the intercept matching by URL pattern, not by a one-shot registration.
- The test assumes the `product.inStock` subject exists in the fixture set restored by `cy.restore()`.
- All UI locators use `data-test` attributes; no selectors are derived from visible text (except the success/failure message assertions).
