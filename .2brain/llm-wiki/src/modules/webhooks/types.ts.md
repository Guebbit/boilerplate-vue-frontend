---
source: src/modules/webhooks/types.ts
sha256: 05ae2351502941aa4ce9c889f6783a1eb2c3b3a364d9f383e4ef97c4c32d7a64
signature: 785cd00c0dafc61974736db52fb65530d182b1c0e619cedb90658f2bee3d2eba
generated_at: 2026-11-10T06:17:01.237677+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/types.ts

## Purpose

Defines view-layer type shapes for the webhooks module. It exists to give the filter state a shared, named contract between the filter bar component and the page view, without polluting the API contract (`@types`) or the store's state definition.

## Key elements

- **`WebhookDeliveryFilters`** (exported interface) — The filter-bar state for the delivery log. Fields:
  - `subscriptionId?: string` — restricts to one subscription; omit for all.
  - `status?: WebhookDeliveryStatus` — restricts to one status; omit for all.
  - `page: number` — 1-based page number. Bundled with the filters because resetting filters should also reset the page.
- Imports `WebhookDeliveryStatus` (type-only) from `@types`.

## Relationships

- **`WebhookDeliveriesFilters.vue`** — Emits an object shaped as `WebhookDeliveryFilters` when the user changes a filter or page.
- **`WebhookDeliveries.vue`** — Consumes the emitted filters, reads them back from the route query string, and passes them into the data-fetching logic. It is the single place where the filter state and the URL stay in sync.

## Notes

- The `page` field is **required** (non-optional), unlike the two filter fields. This means a valid filter state always has a page; the component emitting the state is responsible for supplying it (typically `1` when filters change).
- These types are deliberately scoped to the view layer. Do not reuse them in API request/response definitions or store state; use `@types` for that.
