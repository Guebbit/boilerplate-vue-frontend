---
source: src/modules/orders/domain/hard-delete.ts
sha256: cb86f8710e8fd3ed181d45a4a6aff057d94f87575662a28bf43f4af9acd9623e
generated_at: 2026-10-17T01:15:18.243496+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/hard-delete.ts

## Purpose

Defines the client-side guard for the "permanent delete" action on an order row. It mirrors the server's 409 rule (`ORDER_NOT_CANCELLED` / `ORDER_INVOICED`) so the UI can hide the button before a request would be rejected. Kept as a pure, dependency-free module (no Vue, no I/O) so the rule is trivially testable and reusable.

## Key elements

- **`HardDeletableOrder`** (interface) – Minimal structural type (`status: string`, `paymentStatus: string`) that any object must satisfy to be evaluated by the rule; decouples the check from the full order model.
- **`canHardDelete(order: HardDeletableOrder): boolean`** – Returns `true` only when `status === 'cancelled'` **and** `paymentStatus === 'unpaid'`. No side effects, no network calls.

## Relationships

- **`domain/index.ts`** – Barrel file that re-exports `canHardDelete` (and `HardDeletableOrder`) so consumers import from the module root rather than reaching into the file path.
- **`tests/hard-delete-domain.spec.ts`** – Unit tests that exercise `canHardDelete` against the cancelled/unpaid, cancelled/paid, and non-cancelled combinations.
- **`views/OrdersList.vue`** – Calls `canHardDelete` per row to conditionally render (or disable) the hard-delete button, preventing the user from triggering an action the API would reject with 409.

## Notes

- The check is intentionally **conjunction** (`&&`): an order that is cancelled but already invoiced/paid is *not* deletable, matching the server's `ORDER_INVOICED` guard.
- The interface is structural, not nominal—any object with the two string fields satisfies it, so the rule can be called with partial order shapes (e.g., from a list query that omits unrelated fields).
- Status and payment values are plain strings; there is no enum import here. Adding a new payment status that should also be deletable means updating both the server rule and this constant.
