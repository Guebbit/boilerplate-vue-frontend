---
source: tests/e2e/specs/journeys/cu26-a-pulled-product-leaves-a-message.cy.ts
sha256: fb69d43cce460811580f4e828bba19b6536611a0d19862476c554c34323b230c
generated_at: 2026-10-17T02:12:15.857855+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu26-a-pulled-product-leaves-a-message.cy.ts

## Purpose

End-to-end test for journey **CU26**: an editor soft-deletes a product, and a customer who has it in both cart and wishlist is notified live (toast + badge) and retains those notifications in the bell panel until explicitly deleting them or clearing all. The test verifies the full notification lifecycle—delivery, persistence across reloads, individual deletion, and bulk clear—without requiring a page reload to see the toast.

## Key elements

- **`describe('CU26 · …')`** — single-suite test with one `it` block covering the entire journey in sequence.
- **`BELL`, `BADGE`, `ROWS`** (module-level constants) — `data-test` selectors for the notifications bell button, the unread-count badge, and the message list items.
- **`beforeEach`** — visits `/en`, restores the database snapshot, then re-visits.
- **Test body steps** (delimited by `cy.step`):
  1. Logs in as `user`, adds a seeded in-stock product to cart, confirms it is also in the wishlist.
  2. Editor issues `DELETE /products/:id` via API → asserts toast text and badge count of 2.
  3. Verifies cart and wishlist no longer show the product.
  4. Opens the bell panel → asserts two rows naming the product with "Removed from your cart" / "Removed from your wishlist"; badge disappears.
  5. Reloads → messages persist as read (no badge).
  6. Deletes one row → only one remains after reload.
  7. Clicks "Clear all" → empty state shown, persists after reload.
  8. Restores the product via `POST /products/:id/restore` to leave the shop clean.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addOpenProductToCart` and `searchAndOpenProduct`, which encapsulate the "search for a product, open it, and add it to the cart" UI flow so the test doesn't hard-code navigation.

## Notes

- The editor's action is performed **via API** (`cy.apiAs('editor', 'DELETE', …)`), not through the UI, because the editor is the *cause* and the customer's bell is the *subject* under test.
- The test depends on a **seeded customer** who already has the product in their wishlist; only the cart addition is done explicitly.
- The `requires-module` comment at the top lists five backend modules (`account`, `cart`, `notifications`, `products`, `wishlist`)—all must be active for this spec to pass.
- Cleanup is **in-test** (restore at the end) rather than in `afterEach`; if the test fails mid-way, the product may remain deleted in the snapshot (mitigated by the `cy.restore()` in `beforeEach` of the next run).
