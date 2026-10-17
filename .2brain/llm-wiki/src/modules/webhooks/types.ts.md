---
source: src/modules/webhooks/types.ts
sha256: 05ae2351502941aa4ce9c889f6783a1eb2c3b3a364d9f383e4ef97c4c32d7a64
generated_at: 2026-10-17T01:52:44.776253+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/types.ts

## Purpose

Defines the view-layer type that bridges the `WebhookDeliveries` page and its filter bar component. It intentionally sits outside the API contract (`@types`) and outside the store's own state, existing solely to describe the shape passed between a view and a presentational component.

## Key elements

- **`WebhookDeliveryFilters`** (exported interface) — the filter-bar state for the delivery log:
  - `subscriptionId?: string` — limit to one subscription; `undefined` means all.
  - `status?: WebhookDeliveryStatus` — limit to one delivery status; `undefined` means all.
  - `page: number` — 1-based page number, kept co-located with filters so a stale page is invalidated together with a stale filter set.

## Relationships

- **Imports** `WebhookDeliveryStatus` from `@types` (used as the type of `status`).
- **Consumed by** `WebhookDeliveriesFilters.vue` — the component emits this shape to report the current filter selection upward.
- **Consumed by** `WebhookDeliveries.vue` — the view mirrors the emitted values into the route query string and passes them back down.

## Notes

- This file contains **only** a type import and a single interface; there is no runtime code.
- The three optional/required fields are all serializable to query-string parameters, which is why they live in one flat object rather than a nested structure.
- Do not confuse this with the store's internal state or the API response types — those live elsewhere. Adding fields here changes what the filter bar can express and what the route query carries.
