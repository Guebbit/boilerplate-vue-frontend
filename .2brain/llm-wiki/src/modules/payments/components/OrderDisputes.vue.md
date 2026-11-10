---
source: src/modules/payments/components/OrderDisputes.vue
sha256: 41bad8f01f5ac1e756186d2e09ae8d9f1ca923b84ad834482fa0b23c51b1e473
signature: 055dfee0431e979211a1fc734479b7f92e40f1979150eacc1e00479d666fea7d
generated_at: 2026-11-10T05:07:54.659253+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/OrderDisputes.vue

## Purpose

A thin presentational wrapper that displays the dispute banner for a specific order. It reads the already-fetched `payment` from the shared payments store and passes that payment's disputes down to `DisputeBanner`, filtering out disputes that belong to a different order (stale response guard). It performs no fetching of its own.

## Key elements

- **`export default { name: 'OrderDisputes' }`** — Named-component block (required for `<KeepAlive>` / devtools since `<script setup>` cannot declare a name).
- **`orderId` prop** — Identifies which order this instance renders disputes for.
- **`payment` (from `usePaymentsStore`)** — The last payment read by the store, regardless of which order it was for.
- **`disputes` (computed)** — Returns `payment.disputes` only when `payment.orderId === orderId`; otherwise returns `[]`. This prevents a late-arriving response for a different order from leaking disputes into the wrong banner.
- **Template** — Renders a single `<DisputeBanner :disputes="disputes" />`.

## Relationships

- **`src/modules/payments/components/DisputeBanner.vue`** — Sole child rendered in the template; receives the filtered `disputes` array.
- **`src/modules/payments/store.ts`** — Source of the `payment` ref via `usePaymentsStore`; this component is read-only against the store.
- **`src/modules/payments/index.ts`** — Barrel export; the component is exposed through it, while the store import is done directly (not via the barrel) to keep the store on this side of the dependency and avoid a circular import.
- **`src/modules/payments/tests/dispute-banner.spec.ts`** — Tests the child `DisputeBanner` in isolation; does not test this wrapper.

## Notes

- The store's `payment` is order-agnostic (it holds whichever payment was last fetched). The `orderId` comparison in the computed is the only guard preventing cross-order data leakage.
- No lifecycle hooks, watchers, or emits — the component is purely reactive and stateless beyond the prop.
- The store must be populated by the parent page (via `useOrderRefund` or similar) before this component mounts; it will render an empty banner if the store hasn't been read yet.
