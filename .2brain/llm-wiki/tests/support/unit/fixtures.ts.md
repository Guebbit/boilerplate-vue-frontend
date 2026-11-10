---
source: tests/support/unit/fixtures.ts
sha256: ef26ca062344f110aa6acabbd4a6fbfe1597ca8f8e82147574ed72fe0cc0294f
signature: 67cb7faedb5343c09a2d6928fe94f0ed1d28c75d6ea76eadc616a9c8960bba85
generated_at: 2026-11-10T07:41:22.776841+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/fixtures.ts

## Purpose

Typed factory functions that produce valid contract entities (Order, Payment, Account, User, Return, Product, InventoryLevel, PreorderLevel, PreorderProductSummary, PreorderFulfillmentOrder, FulfillmentOrder) for unit specs. Every factory runs its output through the generated Orval response schema (`contractBody`) so that a contract field added or made required becomes a compile-time or factory-time error across all consuming specs, rather than a runtime parse failure deep in a mounted view.

## Key elements

- **`NO_ORDER_ACTIONS`** / **`NO_USER_ACTIONS`** / **`ALL_USER_ACTIONS`** / **`NO_PRODUCT_ACTIONS`** — constant objects with every action flag set to `false` (or all `true` for `ALL_USER_ACTIONS`). Used as defaults so specs override only the flags they care about.
- **`userActionsOf(allowed)`** — spreads `NO_USER_ACTIONS` then applies the caller's `Partial<UserActions>`, returning a complete `UserActions`.
- **`anOrder(overrides?)`** — builds a valid `Order` (zero totals, empty items, `pending`/`unpaid` defaults) validated against `GetOrderByIdResponse`.
- **`aPayment(overrides?)`** — valid `Payment` validated against `GetPaymentResponse`.
- **`anAccount(overrides?)`** — valid `Account` (id, email, username) validated against `UpdateAccountResponse`.
- **`aUser(overrides?)`** — valid `User` with `NO_USER_ACTIONS` default, validated against `GetUserByIdResponse`.
- **`aReturn(overrides?)`** — valid `Return` (one line, approved, buyer-opened) validated against `GetReturnByIdResponse`.
- **`aProduct(overrides?)`** — valid `Product`; additionally derives `buyable` from `purchasable`/`inStock`/`backorder` before validation against `GetProductByIdResponse`.
- **`aLevel(overrides?)`** — valid `InventoryLevel` validated against `GetInventoryLevelResponse`.
- **`aPreorderLevel(overrides?)`** — valid `PreorderLevel` validated against the array-item schema of `ListPreorderLevelsResponse`.
- **`aPreorderSummary(overrides?)`** — valid `PreorderProductSummary` validated against the array-item schema of `SummarizePreorderFulfillmentOrdersResponse`.
- **`aPreorderFulfillmentOrder(overrides?)`** — valid `PreorderFulfillmentOrder` validated against the array-item schema of `ListPreorderFulfillmentOrdersResponse`.
- **`aFulfillmentOrder(overrides?)`** — valid `FulfillmentOrder` (one physical line, open, nothing shipped) validated against `GetFulfillmentOrderResponse`.

## Relationships

- **Consumed by** the 15 spec files under `src/modules/account/tests/` (account-export-download-view, link-token-confirm-card, password-reset-confirm-view, password-reset-request-view, profile-export-data, profile-page, profile-stale-record, two-factor-challenge-view, two-factor-store, two-factor-view) and `src/modules/cart/tests/` (add-to-cart-button, cart-line-price, cart-view-double-submit, cart-view-interleavings, cart-view-stale-refusal). Each spec imports one or more factories to seed its fixture data instead of hand-rolling raw objects.

## Notes

- This file is an intentional **fork** of the BE `tests/support/body-of.ts`; it is *not* kept in step with the BE version.
- `contractBody` parses the object for validation but the factory returns the **original** object — any `.default()` the schema would inject is never observed by the spec.
- `aProduct` is the only factory that **mutates** the payload before validation (computes `buyable`), reflecting a server-side derivation rule; the other factories pass their literal object through unchanged.
- All monetary fields use string decimals (`'0.00'`, `'50.00'`) to match the contract's string-typed money fields.
