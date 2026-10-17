---
source: src/modules/delivery/index.ts
sha256: 81913896d6ddf68038c2dcbc7585903804c2c5c8082c5d966c44c33e814f2aa9
generated_at: 2026-10-17T00:48:04.525702+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/index.ts

## Purpose

Public barrel for the delivery module. It re-exports four Vue components and one read-only composable so that consumers (other modules, pages) can `import { ShippingSelector } from '@/modules/delivery'` without reaching into internal paths. No logic lives here.

## Key elements

- **`ShippingSelector`** — component for choosing a shipping method; fetches its own cart state.
- **`ShipmentPanel`** — component for viewing parcel/order details; fetches its own order state.
- **`ShippingMethodName`** — small presentational component that renders a shipping method's display name.
- **`PreorderFulfillmentTable`** — the second-tab component of the preorder board (a page in `inventory`); read-only.
- **`usePreorderSummaries`** — read-only composable that supplies count/state data for the preorder product table; performs no writes.

## Relationships

- Re-exports all five graph neighbors directly; this file has no other runtime dependencies.
- `PreorderFulfillmentTable` and `usePreorderSummaries` are consumed by the **inventory** module's preorder board page.
- `ShippingSelector`, `ShipmentPanel`, and `ShippingMethodName` are consumed by the **cart** flow.
- Each component fetches its own data (cart for the selector, orders for the panel), so this barrel does not expose or relay any shared store.

## Notes

- **The store is deliberately absent.** The module doc comment states that exposing a shared store alongside self-fetching components would create a second, wider API path, and "the wider one always wins." Consumers should rely on the components' encapsulated fetching rather than importing a store directly.
- All five exports are **read-only** in practice — none of them write to external state through this barrel.
