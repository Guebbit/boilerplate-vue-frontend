---
source: src/modules/returns/index.ts
sha256: a36c0012587ebbc428e4e031beef53e3414c16094d2192928a6543563b657ef4
signature: a36c0012587ebbc428e4e031beef53e3414c16094d2192928a6543563b657ef4
generated_at: 2026-11-10T05:37:55.133978+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/index.ts

## Purpose

Public barrel for the `returns` module. It re-exports the single consumer-facing component (`WithdrawalPanel`) so that the order page mounts it as the entry point for all return-related UI (button, confirmation step, and the list of previously opened returns on that order). Keeping the store inside this component prevents sibling modules from accidentally growing their own returns flow.

## Key elements

- **`WithdrawalPanel`** – Re-exported (as default → named) from `./components/WithdrawalPanel.vue`. This is the sole public API of the module.

## Relationships

- **→ `src/modules/returns/components/WithdrawalPanel.vue`** – The only import target; this barrel simply re-exports its default export under the name `WithdrawalPanel`. Consumers import from this file rather than reaching into the `components/` directory.

## Notes

- The module exposes exactly one export. Any new public surface must be added here intentionally.
- The design intent (per the module doc comment) is that return-state lives *inside* `WithdrawalPanel`, not in a shared store that other modules could import and duplicate.
