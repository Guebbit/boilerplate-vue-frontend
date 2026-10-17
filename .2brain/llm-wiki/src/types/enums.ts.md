---
source: src/types/enums.ts
sha256: 6eebbd119601889126b17055cf2a6da2236715632867a092d1f89f3a7ac9279b
generated_at: 2026-10-17T01:56:29.769158+00:00
model: ollama:qwen3.8:27b
---

# src/types/enums.ts

## Purpose

The single sanctioned **runtime** bridge between `.vue` templates and the generated API. It re-exports a curated set of enum-shaped constants that a template must evaluate at runtime (status-badge colors, `<select>` options, filter values). Everything else in the generated API stays type-only via `@types`; `eslint.config.ts` bans components from importing `@api` directly and allows **only** this file as the named exception.

## Key elements

The file defines no values — it is purely a set of named re-exports from `@api`, grouped by the UI surface that consumes them:

- **Order lifecycle** — `OrderStatus`, `OrderFulfillmentStatus` (status badge, fulfilment filter)
- **Inventory** — `StockMovementReason` (movement-ledger filter)
- **Offline payments** — `RecordOfflinePaymentRequestMethod` (payment-method picker)
- **Translation provenance** — `TranslationOrigin` (stamped on save)
- **Feedback requests** — `FeedbackRequestStatus` (inbox filter / status-change options)
- **Returns** — `ReturnStatus`, `ReturnReason` (returns-list filters)
- **Sort tokens** — `ProductSortItem`, `UserSortItem`, `OrderSortItem` (table-column sort)
- **Stats** — `StatsInterval` (period-form bucket size)
- **Order list filters** — `OrderPaymentStatus`, `OrderReturnStatus` (derived at serialization)
- **Payments & refunds** — `PaymentDisplayStatus`, `PaymentMethodKind`, `PaymentSortItem`, `PaymentAttentionKind`, `RefundStatus`, `RefundReason`, `RefundFailureReason`

## Relationships

- **`@api`** (sole import source): every line in this file re-exports one or more enum members from that generated package. No other module is imported.
- **`.vue` components** (sole intended consumers): templates reference these enums for branching and option lists. ESLint forbids them from reaching `@api` directly.

## Notes

- **Additive, not wildcard.** A new enum a component needs is a single `export { X } from '@api'` line. `export * from '@api'` is deliberately *not* used so that a template's runtime surface cannot widen silently.
- **Comments are consumer-oriented.** Each block comment names the UI element or form that reads the enum, not a description of the enum's values. When adding a new re-export, follow the same "where is it used" convention.
- **Type-only vs. runtime boundary.** If a value can be expressed as a type (`@types`), it should not be re-exported here. This file exists only for values a template must *evaluate* (e.g., building an options array), not for values a component merely *references in its type signature*.
