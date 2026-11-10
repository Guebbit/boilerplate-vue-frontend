---
source: src/infrastructure/utils/single-flight.ts
sha256: 65d4a367f6fd272ea351f384e2ddb7eeec4ef95aa6686490367f26d9f906c6a0
signature: 4311f280d7f1543756982550b4182ac882ede2e434246aec2ea9da4129300d67
generated_at: 2026-11-10T03:13:35.218471+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/single-flight.ts

## Purpose

Prevents re-entrant execution of an async handler: any call made while a previous call is still pending is silently dropped. It exists because UI-level guards like `:disabled="loading"` only take effect on the next render, leaving a window where a double-click (or rapid repeat trigger) can enqueue the operation twice—critical when the downstream store queues questions and a double answer produces a double write.

## Key elements

- **`singleFlight`** (exported const) — Generic higher-order function. Accepts an async (or possibly-synchronous) action and returns a wrapped handler of the same signature. While one invocation is in flight, additional invocations return `undefined` (not a `Promise`) instead of starting a second run. The guard flag resets via `.finally()`, so it releases on both resolution and rejection.

## Relationships

- **`src/modules/delivery/components/FulfillmentOrderCard.vue`** — Imports `singleFlight` to wrap its confirm-then-write handler. Without the guard, two rapid presses of the fulfillment trigger would queue two dialog questions in the dialog store and, upon answering both, issue two writes.

## Notes

- The `running` flag lives in the closure returned by each `singleFlight` call—there is one guard per wrapped action, not a global lock.
- Dropped calls return bare `undefined`, not a `Promise`. Any caller that unconditionally `.then()`s or `await`s the result without a check will throw.
- If the wrapped action itself returns `undefined` (i.e. is synchronous and short-circuits), the guard releases immediately in the same tick.
- The generic `TArguments extends unknown[]` makes the wrapper fully type-transparent: callers pass through the original action's parameter and return types.
