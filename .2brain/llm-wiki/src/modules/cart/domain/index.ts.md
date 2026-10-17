---
source: src/modules/cart/domain/index.ts
sha256: 04445577066898c9ebede296e9e27e0b9009fcfb20f81ea588e5aefa99fb4606
generated_at: 2026-10-17T00:36:01.088827+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/index.ts

## Purpose

Barrel (module index) for the cart domain layer. It re-exports every public symbol from the sibling domain files so that consumers import from a single entry point. The layer is intentionally framework-free — pure rules, with no Vue, Pinia, or axios imports (enforced by lint).

## Key elements

- **Quantity** — `MIN_LINE_QUANTITY`, `steppedQuantity` (re-exported from `./quantity`)
- **Checkout errors** — `classifyCheckoutError` plus types `CheckoutErrorVerdict`, `CheckoutShortfallLine`, `UnavailableCartLine` (from `./checkout-errors`)
- **Checkout attempt** — `checkoutFingerprint` (from `./checkout-attempt`)
- **Expected total** — `expectedTotalOf`, `fromMinorUnits`, `toMinorUnits`, type `ExpectedTotal` (from `./expected-total`)
- **Guest cart** — `MAX_GUEST_LINES`, `MAX_GUEST_LINE_QUANTITY`, `addGuestLine`, `guestCartQuantity`, `parseGuestCart`, `parseMergeAttempt`, `removeGuestLines`, `setGuestLineQuantity`, `subtractGuestLines`, types `GuestCartLine`, `MergeAttempt` (from `./guest-cart`)
- **Merge report** — `changedMergeLines`, `mergeReportKind`, types `MergeReportKind`, `MergeReportLine` (from `./merge-report`)
- **Stock polling** — `stockPollIntervalMs` (from `./stock-poll`)

## Relationships

- **Imported by (consumers):** `GuestCart.vue`, `MergeReportAlert.vue`, `guest-cart-storage.ts`, `use-cart-stock-poll.ts`, `use-guest-cart.ts`, `use-line-quantity.ts`, `store.ts`, and `add-to-cart-button.spec.ts` all pull symbols through this barrel rather than reaching into individual domain files.
- **Re-exports from (sibling domain files):** `quantity.ts`, `checkout-errors.ts`, `checkout-attempt.ts`, `expected-total.ts`, `guest-cart.ts`, `merge-report.ts`, `stock-poll.ts`. This file contains no logic of its own; it is purely a re-export surface.

## Notes

- The module doc-comment asserts a lint-enforced boundary: no Vue, Pinia, axios, or "every tier" may be imported here or by its re-exported siblings. Treat violations as a lint failure, not just a style issue.
- For deeper layering rationale, see `docs/theory/domain-layer.md` (referenced in the file's doc-comment).
- Because this is a pure barrel, adding a new domain module means adding one line here; the consumers' import paths do not change.
