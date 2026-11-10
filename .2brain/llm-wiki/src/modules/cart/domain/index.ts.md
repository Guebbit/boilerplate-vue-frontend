---
source: src/modules/cart/domain/index.ts
sha256: d2781b1c82f3591cdd76565da1fdb1065adc4c095790e164dd20d64429d8bf72
signature: d2781b1c82f3591cdd76565da1fdb1065adc4c095790e164dd20d64429d8bf72
generated_at: 2026-11-10T03:57:38.811299+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/index.ts

## Purpose

Barrel file for the cart domain layer. It re-exports every public symbol (values, types, and constants) from the sibling domain modules so that consumers can import cart rules from a single path. The file contains no logic of its own; its sole job is to define the domain's public API surface.

## Key elements

- **Re-exported constants** — `MIN_LINE_QUANTITY`, `MAX_GUEST_LINES`, `MAX_GUEST_LINE_QUANTITY`, `stockPollIntervalMs`: domain-level limits and timing values.
- **Re-exported functions** — `steppedQuantity`, `classifyCheckoutError`, `checkoutFingerprint`, `emptyCart`, `addGuestLine`, `guestCartQuantity`, `parseGuestCart`, `parseStoredGuestCart`, `parseMergeAttempt`, `removeGuestLines`, `setGuestLineQuantity`, `subtractGuestLines`, `changedMergeLines`, `mergeReportKind`: pure business-rule functions.
- **Re-exported types** — `ExpectedTotal`, `MergeReportKind`, `MergeReportLine`, `GuestCartLine`, `MergeAttempt`, `CheckoutErrorVerdict`, `CheckoutShortfallLine`, `UnavailableCartLine`: structural types shared across the cart feature.

## Relationships

- **Aggregates** the domain submodules it re-exports from: `./quantity`, `./checkout-errors`, `./checkout-attempt`, `./empty-cart`, `./expected-total`, `./guest-cart`, `./merge-report`, `./stock-poll`.
- **Consumed by** the composables (`use-guest-cart`, `use-line-quantity`, `use-checkout-refusals`, `use-cart-stock-poll`), the Vue components (`GuestCart`, `SignedInCart`, `MergeReportAlert`), and `checkout-attempt-storage.ts`, all of which import cart rules through this barrel rather than reaching into individual submodules.

## Notes

- The file header declares the module as lint-guaranteed free of Vue, Pinia, axios, and all other tiers. If a sub-module you add here pulls in a framework import, that lint rule will break.
- All re-exports are named (no default exports). Add new domain symbols here to make them part of the public cart-domain API.
- The JSDoc points to `docs/theory/domain-layer.md` for the architectural rationale behind this tier's isolation.
