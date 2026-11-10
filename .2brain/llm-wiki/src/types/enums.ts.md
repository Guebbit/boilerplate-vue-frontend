---
source: src/types/enums.ts
sha256: 1a717d4897de41b71fe394a3bc404116407960f20c2a4085c4443941ccbdafc3
signature: 1a717d4897de41b71fe394a3bc404116407960f20c2a4085c4443941ccbdafc3
generated_at: 2026-11-10T06:22:32.533822+00:00
model: ollama:qwen3.8:27b
---

# src/types/enums.ts

## Purpose

A curated re-export of enum-shaped constants from `@api`, serving as the single allowed runtime import path for `.vue` components. It exists because ESLint bans components from importing `@api` directly or pulling runtime values through `@types`; this file is the one named exception, letting templates reference a handful of discriminant values (badge colors, select options, sort tokens, filter states) without widening the surface of what a template can reach.

## Key elements

- **Pure re-export module** — no logic, no computed values, no local definitions. Every line is a named `export { … } from '@api'`.
- **Order domain** — `OrderStatus`, `OrderFulfillmentStatus`, `OrderPaymentStatus`, `OrderReturnStatus`, `OrderSortItem`.
- **Inventory** — `StockMovementReason`.
- **Tasks** — `TaskStatus`, `TaskCategory`, `TaskKind`, `TaskSource`.
- **Returns** — `ReturnStatus`, `ReturnReason`, `ReturnDeclineReason`, `StaffStatementChannel`.
- **Payments & refunds** — `PaymentDisplayStatus`, `PaymentMethodKind`, `PaymentSortItem`, `PaymentAttentionKind`, `RefundStatus`, `RefundReason`, `RefundFailureReason`, `RecordOfflinePaymentRequestMethod`.
- **Products & users** — `ProductSortItem`, `UserSortItem`.
- **Misc** — `TranslationOrigin`, `StatsInterval`, `PreorderFulfillmentState`, `ShipmentLostReason`, `HoldFulfillmentOrderRequestReason`, `ListAuditEntriesOutcome`, `WebhookDeliveryStatus`, `ExampleSortItem`, `ExampleStatus`.

## Relationships

No graph neighbors are recorded. The file's sole dependency is the `@api` package (runtime values only); nothing in this codebase imports *from* this file except `.vue` components that branch on the re-exported constants in templates or `v-model` selects.

## Notes

- **Adding a constant is intentional friction.** A new enum a component needs is a one-line addition here. `export * from '@api'` is deliberately avoided so the set of runtime values available to templates never silently widens.
- **Enforced by ESLint, not by convention.** `eslint.config.ts` blocks `@api` and runtime `@types` imports in components and whitelists this file. Bypassing it is a lint error, not a style warning.
- **All values are closed sets.** Several exports (e.g. `ListAuditEntriesOutcome`, `WebhookDeliveryStatus`) are noted as "closed to this set in the URL," meaning the UI filter is exhaustive over the enum and won't accept ad-hoc strings.
