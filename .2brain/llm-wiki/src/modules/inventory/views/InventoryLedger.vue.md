---
source: src/modules/inventory/views/InventoryLedger.vue
sha256: 9d321142aea27e822eb48691a9fe6bd5c2058a6bebfdd201d408faae43ef19d7
signature: 602f93d52bd53f87afa178d179dee6f034d33a3d6e46cbfe41d322867c504264
generated_at: 2026-11-10T04:37:36.113273+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/views/InventoryLedger.vue

## Purpose
Admin-side inventory page that displays the current stock board and the full movement ledger on a single screen, so that a write (receipt or adjustment) is visibly reflected in both simultaneously. It owns no domain logic; all state comes from the shared `useInventoryStore()`.

## Key elements

- **Component name block (`InventoryLedgerPage`)** — Separate `<script>` declaring `name` for devtools and `<KeepAlive>`; required because `<script setup>` cannot set it.
- **`movementLedger` (template ref)** — Holds a reference to the `MovementLedger` instance so the board's `history` emit can call the ledger's exposed `focusProduct` method.
- **`session` (`useSessionStore()`)** — Used solely for the `session.can('create', 'StockMovement')` gate that controls whether the two forms are rendered.
- **Template layout** — `TourButton` → two `StockMovementForm` instances (gated) → `StockBoard` → `MovementLedger`, all wrapped in `data-tour` hooks for the guided tour.

## Relationships

- **`StockMovementForm.vue`** — Rendered twice (`mode="receipt"`, `mode="adjust"`), only when the session holds the `create:StockMovement` permission. This page passes no props beyond `mode`.
- **`StockBoard.vue`** — Rendered unconditionally. This page listens to its `history` emit and forwards the `productId` argument to the ledger child.
- **`MovementLedger.vue`** — Rendered unconditionally with a template `ref`. This page calls the ledger's exposed `focusProduct` method in response to the board's emit. Both this component and `StockBoard.vue` read `useInventoryStore()` directly, so no prop/emit wiring is needed for data flow between them.

## Notes

- The only reactive wiring this page performs is the board→ledger `focusProduct` call. All shared data flows through `useInventoryStore()` independently of this component.
- `available` stock is computed server-side; this page deliberately performs no arithmetic.
- Manager-role users can see the board and ledger but not the two forms (they lack `create:StockMovement`).
- `data-tour` attributes (`stock-forms`, `stock-board`, `stock-ledger`) drive the `TourButton` guided tour.
