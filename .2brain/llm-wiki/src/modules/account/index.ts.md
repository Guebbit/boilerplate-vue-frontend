---
source: src/modules/account/index.ts
sha256: 821566e69b2bc96efd51be6344a4a8d2919204b5d3b48cd3b2f74ccab365704c
signature: 821566e69b2bc96efd51be6344a4a8d2919204b5d3b48cd3b2f74ccab365704c
generated_at: 2026-11-10T03:24:43.272929+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/index.ts

## Purpose

Public barrel for the `account` module. It exposes two UI components to consumers (notably the `cart` module's checkout flow) so they can render address selection and purchase-hold messaging without reaching into the account module's internal stores or dialogs.

## Key elements

- **`AddressPicker`** (re-exported from `./components/AddressPicker.vue`) — Vue component that presents the buyer's address options during checkout.
- **`PurchaseHoldNotice`** (re-exported from `./components/PurchaseHoldNotice.vue`) — Vue component rendered as a banner explaining why a checkout is currently paused.

## Relationships

- **`src/modules/account/components/AddressPicker.vue`** — the actual component implementation that this barrel re-exports as `AddressPicker`.
- **`src/modules/account/components/PurchaseHoldNotice.vue`** — the actual component implementation that this barrel re-export as `PurchaseHoldNotice`.

Both are the sole direct dependencies of this file; no other modules are imported here.

## Notes

- The barrel deliberately limits the public surface to these two components. The account module's stores and add/edit dialogs are intentionally **not** exposed — consumers are expected to interact with them through these components' props/events rather than reaching into internal state.
