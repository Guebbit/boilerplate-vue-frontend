---
source: tests/e2e/specs/journeys/op10b-the-flags-through-the-form.cy.ts
sha256: b4ea2585ecf0f34ffb7cbdec4a439c5220d7236e626621ea6ac4bf0e22cc2afe
signature: 52881d0e190fdb4a4c05c31c6f6813aa20a22c2f9dcdca6480a088da09439f0f
generated_at: 2026-11-10T07:11:53.455858+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op10b-the-flags-through-the-form.cy.ts

## Purpose

End-to-end Cypress spec (journey OP10b) that verifies product flags—`requiresShipping`, `noWithdrawal`, `purchasable`—survive the create-and-edit form round-trip, and that taking a product off sale from the edit form is reflected in the staff list's sale-status filter and in the guest-facing product page.

## Key elements

- **`FlagsLike`** (interface) — the minimal product shape the spec reads back from the API (`id`, `requiresShipping?`, `noWithdrawal?`, `purchasable?`).
- **`unique()`** — returns a timestamp + random-suffix string so two specs running against the same backend don't collide on product titles.
- **`createWithFlag(title, flag)`** — navigates to the product-create form, fills title/price, clicks the given flag's checkbox (`requires-shipping` or `no-withdrawal`), uploads a fixture image, submits, and resolves the new product's `id` from the URL.
- **`describe` / `it` block** — a single test that uses `cy.step` to demarcate three scenarios: (1) create with `requiresShipping=false`, verify API + edit form; (2) create with `noWithdrawal=true`, verify API + edit form; (3) toggle `purchasable` off via the edit form, then confirm the staff filter finds it and a guest sees it listed but not add-to-cart-enabled.
- **`beforeEach`** — visits `/en`, calls `cy.restore()`, revisits `/en` (snapshot-restore pattern for a clean backend state per test).

## Relationships

No graph neighbors are recorded for this file. The `requires-module` header declares a dependency on the `account` and `products` modules.

## Notes

- The spec is written as **one** `it` with `cy.step` dividers rather than multiple `it` blocks, so a failure in any step aborts the remaining steps.
- `cy.restore()` in `beforeEach` implies the suite relies on a snapshot/restore fixture to reset backend data; running this spec in isolation without the supporting infrastructure will fail.
- Several interactions use `{ force: true }` (checkbox clicks, file input select) because the elements may be partially obscured by the translation panel or other form UI.
- The checkout-side behavior of these flags is explicitly out of scope here; it is covered by journey **CU10**.
- The file path `tests/e2e/fixtures/sample-image.png` is hardcoded as the image upload fixture.
