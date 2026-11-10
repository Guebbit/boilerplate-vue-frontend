---
source: tests/e2e/specs/journeys/cu12-buy-again-catalogue-changed.cy.ts
sha256: c5211d455503418beff9ef3ebe76f51b9c9d72cd09d1dc039ff59ce442bf658c
signature: 3867a3c84e96b222525452e0f1ad21db36fe64f9dc43e313a227e5ebc9caccc7
generated_at: 2026-11-10T06:54:31.920702+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu12-buy-again-catalogue-changed.cy.ts

## Purpose

End-to-end test for journey CU12: a customer re-orders from a past order whose three products have diverged (one unchanged, one with a replaced image, one deleted). It verifies that the order page renders live-catalogue images (never a frozen copy or a broken one), that "buy again" names the line it could not restore, and that the resulting cart contains exactly the still-purchasable items. No payment occurs.

## Key elements

- **`OrderLine`** (interface) — shape of a single order item as returned by the API; `product` is always present, `current` (with optional `imageUrl`) is absent when the product is deleted.
- **`Fate`** (type) — the three catalogue outcomes: `'untouched' | 'replaced' | 'deleted'`.
- **`fateOf(line)`** (const function) — classifies a line: no `current` → `deleted`; `imageUrl` matches `UPLOAD_PATH` → `replaced`; otherwise → `untouched`.
- **`describe('CU12 · …')`** — single `beforeEach` (visit → `cy.restore()` → visit) and one test case that:
  - fetches the order via `cy.apiAs` to determine each line's fate,
  - asserts the page's `data-test=lazy-image` elements show the live `imageUrl` (or a placeholder for deleted lines) and that the image actually decoded (`naturalWidth > 0`),
  - clicks `data-test=order-reorder`, confirms the "no longer sold" notice names the deleted product,
  - asserts the cart (DOM and API) holds exactly the two non-deleted items.

## Relationships

- **`tests/support/e2e/images.ts`** — provides `UPLOAD_PATH`, a regex that identifies content-hashed uploaded image URLs. `fateOf` uses it to distinguish a *replaced* image (user-uploaded) from a *seeded* one. No other symbols from that module are used here.

## Notes

- The test depends on a pre-seeded fixture (`cy.subjectId('order.mixedImageStates')`) that must contain exactly one line of each fate; the `toSorted()` comparison enforces that.
- Image-decode assertion (`naturalWidth > 0`) catches 404s that would still set a valid `src` attribute but render a zero-size image — a check a simple attribute assertion would miss.
- `cy.restore()` in `beforeEach` resets the database between runs; the test is not idempotent without it.
- The `requires-module` comment at the top declares this test needs the `cart`, `orders`, and `products` feature modules enabled in the test environment.
