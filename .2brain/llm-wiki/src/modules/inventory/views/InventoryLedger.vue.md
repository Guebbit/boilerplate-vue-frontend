---
source: src/modules/inventory/views/InventoryLedger.vue
sha256: a79314e9f5827ac3ea8dcae91862ff251716a169063a828a56a476d825d29daa
generated_at: 2026-10-17T01:02:18.771359+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/views/InventoryLedger.vue

## Purpose

The single-screen inventory admin page that pairs the live stock board with the movement ledger and the two entry forms (receipt / adjust). It exists so that a stock write is visible in both the board and the ledger simultaneously, without tab-switching, and so that the one explicit cross-component interaction (board → ledger focus) is wired at this level.

## Key elements

- **`export default { name: 'InventoryLedgerPage' }`** — Named component block; required because `<script setup>` cannot declare `name` itself. Used by devtools and `<KeepAlive>`.
- **`movementLedger` (ref)** — Template ref to the `MovementLedger` child so its exposed `focusProduct(productId)` method can be called from `StockBoard`'s `history` emit. This is the *only* cross-child wiring this page owns.
- **`session` (from `useSessionStore`)** — Used solely in the template to gate the two `StockMovementForm` instances behind the `create:StockMovement` permission (manager/reader roles see the board and ledger but not the forms).
- **Template layout** — Three stacked sections: permission-gated form row (2-col grid), `StockBoard`, `MovementLedger`. No local computed properties, no local data mutations.

## Relationships

- **`StockBoard.vue`** — Rendered below the forms. Emits `history(productId)` when the user clicks a product's history link; this page forwards that event to the ledger's `focusProduct`. Reads `useInventoryStore()` internally (not via this page).
- **`MovementLedger.vue`** — Rendered last. Receives `ref` binding so its exposed `focusProduct` method is callable. Also reads `useInventoryStore()` internally.
- **`StockMovementForm.vue`** — Rendered twice (`mode="receipt"` and `mode="adjust"`), both inside a `v-if` on the `create:StockMovement` permission. The page passes only the `mode` prop; all form logic and store writes live inside the component.

## Notes

- Deliberate design: board and ledger are **not** behind tabs. The rationale (in the file's doc comment) is that a write should land in both at once—board number changes *while* the ledger row appears—so a single-screen layout makes that atomicity visible.
- `available` (on-hand quantity) is **derived server-side**. This page and its children do no arithmetic on it; adding a client-side subtraction would create a second source of truth.
- Reactivity between `StockBoard` and `MovementLedger` flows through the shared Pinia store (`useInventoryStore`), not through this page. The page's only active role in that flow is the `history → focusProduct` bridge.
- The `#inventory-page` id is the root anchor; styling is handled by the class utilities in the template, not by a scoped `<style>` block.
