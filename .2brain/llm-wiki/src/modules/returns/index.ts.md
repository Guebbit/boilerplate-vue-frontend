---
source: src/modules/returns/index.ts
sha256: a36c0012587ebbc428e4e031beef53e3414c16094d2192928a6543563b657ef4
generated_at: 2026-10-02T15:43:57.336829+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/index.ts

## Purpose

Public barrel for the Returns module. It exposes the single public entry point (`WithdrawalPanel`) so the order page can import one component that encapsulates the entire returns flow (trigger button, confirmation step, and the list of previously opened returns) without leaking internal store or sub-component details to the outside.

## Key elements

- **`WithdrawalPanel`** (named re-export of the default export from `./components/WithdrawalPanel.vue`) — the panel component mounted by the order page. It owns its own store internally, so consuming pages do not need to wire up additional state.

## Relationships

- **`src/modules/returns/components/WithdrawalPanel.vue`** — sole import source. This barrel re-exports its default as `WithdrawalPanel`, making it the only path external code uses to reach the component. No other files in the module are exported publicly.

## Notes

- Consumers should import via this barrel (`import { WithdrawalPanel } from '@/modules/returns'`) rather than reaching into `./components/` directly; the barrel is the contract boundary for the module.
- The store lives *inside* `WithdrawalPanel`. Sibling components on the order page are expected to remain agnostic of returns state.
