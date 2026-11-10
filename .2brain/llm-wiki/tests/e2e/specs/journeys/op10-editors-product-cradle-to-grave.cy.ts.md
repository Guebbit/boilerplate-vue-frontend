---
source: tests/e2e/specs/journeys/op10-editors-product-cradle-to-grave.cy.ts
sha256: a859a3e1fa3564880820dd498f066380ced4dc5ac49f4f1791f13b7daa5bbf86
signature: f9323659b1c34b0d3a929468eea5e3c17e7c44dc88ebef9212303a03f9efba7e
generated_at: 2026-11-10T07:11:35.497728+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op10-editors-product-cradle-to-grave.cy.ts

## Purpose

End-to-end journey spec that exercises the full lifecycle of an editor-created product — creation in two languages, deactivation, soft-delete, restore, and hard-delete — verifying guest visibility (and the guest API cache invalidation) at each stage. A second scenario confirms that the "opening count" (stock receipt) field is invisible to editors/managers but functional for admins, and that refused access is recorded in the audit log with the missing permission name.

## Key elements

- **`unique()`** — returns a timestamp+random string so parallel spec runs on the same backend don't collide on product titles, categories, or tags.
- **`guestStatusOf(id)`** — helper that calls the `guestApi` Cypress task to fetch `/products/{id}` as an anonymous user and returns the HTTP status code (expected `404` for deactivated / soft-deleted / hard-deleted products).
- **`ProductLike`, `AuditRowLike`, `MovementLike`** — minimal structural types used in `cy.apiAs` assertions; they intentionally read only the fields the test cares about.
- **`describe("OP10 · An editor's product, cradle to grave")`** — contains two top-level `it` blocks:
  1. *Create → deactivate → soft-delete → restore → hard-delete*, asserting guest 404s, editor list visibility, facet counts, and that a seeded order (`order.productDeleted`) still renders after its product is erased.
  2. *Opening-count permission story*: asserts the editor/manager create form hides `product-on-hand-field`, that `POST /inventory/levels/{id}/receive` is refused with `403 FORBIDDEN`, that the admin form submits a receipt (verified via `/inventory/movements`), and that the audit log records `security.forbidden` with `permission: 'create:StockMovement'`.
- **`beforeEach`** — visits `/en`, calls `cy.restore()`, and revisits to reset server state between tests.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `eventually` (polling assertion helper used for the audit-log check) and `refusedWith` (fires an API call on a logged-in device and asserts a specific status + error code, used for the stock-receipt refusal).
- **`tests/support/e2e/harness.ts`** — imports `loginDevice`, which returns a Cypress `Chainable` carrying an authenticated device/session for a given persona (`editor`, `manager`), enabling the `refusedWith` calls without switching the primary UI session.

## Notes

- The spec declares `requires-module: account, locales, orders, products`; the `orders` module is needed only for the seeded `order.productDeleted` fixture used in the hard-delete tail.
- `guestStatusOf` routes through a `cy.task('guestApi')` (registered in the Cypress config), not `cy.request`, so it bypasses the session cookie and truly tests the anonymous/public read path.
- The comment "The form fills in from the fetched record; saving before then sends an empty price" is a known timing pitfall: the deactivate step waits for `product-weight-field` to be populated before unchecking `product-active-field` to avoid a failed save.
- Guest reads are cached for one hour on live; every product write invalidates the cache. The spec relies on this by asserting 404 immediately after each state change (deactivate, soft-delete, hard-delete).
- `sample-image.png` in `tests/e2e/fixtures/` is shared with the uploads specs; the `force: true` on `selectFile` works around the input not being visible in the DOM.
