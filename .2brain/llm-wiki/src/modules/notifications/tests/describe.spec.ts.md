---
source: src/modules/notifications/tests/describe.spec.ts
sha256: 64d19458d1fd9c39488daf1dbb57d2252d317450b36e95bd8f53cf8e888c0fd4
generated_at: 2026-10-17T01:09:34.624980+00:00
model: ollama:qwen3.8:27b
---

# src/modules/notifications/tests/describe.spec.ts

## Purpose
Unit tests for the notification sentence builder. Verifies language-preference logic for product names, which i18n dictionary entry each notification code resolves to (with what params), and graceful degradation for missing names, empty line lists, and codes unknown to the current contract. Assertions target the *key* and *named values* rather than English prose, which the store-level spec covers separately.

## Key elements
- **`translate`** (local) — Stub `Translate` that renders `key|name=value|name=value…`, making the exact dictionary call and its arguments visible in the output string.
- **`format`** (local) — Stub date formatter that appends `!` to the ISO string, so tests can confirm the formatter was invoked.
- **`base`** (local) — Shared parameter object (`orderId`, `fulfillmentOrderId`, `titles`, `agreedAt`) for late-preorder notice cases.
- **`confirmNotice`** (local) — Builds a `preorder-confirm-wait` notification with an optional `answerBy` deadline.
- **`describe('productName')`** — Seven cases covering: preferred-language selection, fallback to main language, skipping empty strings, arbitrary-language fallback, and the `notifications.unknown-product` sentinel.
- **`describe('describeNotification')`** — Cases for cart-line, wishlist, cart-merge-refused (multi-line and bare), late-preorder (dated, undated, confirm-wait with/without deadline), `notificationOrderId` extraction, and an unknown future code.

## Relationships
- **`src/modules/notifications/domain/describe.ts`** — Implementation under test; provides `describeNotification`, `productName`, `notificationOrderId`.
- **`src/modules/notifications/domain/index.ts`** — Barrel re-export; the spec imports all three functions and the `Translate` type from `'../domain'` rather than reaching into `describe.ts` directly.

## Notes
- Assertions compare against the raw i18n key (e.g. `notifications.cart-line-removed|name=Collar`), not translated text. The store spec is the layer that verifies the English sentence.
- The unknown-code test casts the code to `as never` to simulate a backend version ahead of the client's contract union; the expected result is the `notifications.unknown` fallback.
- `confirmNotice` conditionally spreads `answerBy` into `params`; the bare variant omits the key entirely (not `undefined`), which exercises the "no deadline" branch.
