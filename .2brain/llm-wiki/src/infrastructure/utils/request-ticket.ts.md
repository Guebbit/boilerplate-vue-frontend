---
source: src/infrastructure/utils/request-ticket.ts
sha256: 53246d1ab1654506957b08c7bb7d1a96e4e7dcc5bdc7d6a0f4ba4dbacbea4c35
signature: 5df1fe748bb056ab1dce8b9c602f24ad73bf2466baea0977a41ba628efa971e9
generated_at: 2026-11-10T03:13:15.463606+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/request-ticket.ts

## Purpose

Provides a ticket-based ordering mechanism so that async answers which write to the same piece of state are applied in the correct sequence. A slow, stale answer can never overwrite a fresher one, and a `reset` call acts as a barrier that invalidates all prior tickets (e.g., a person change). The module is pure — no Vue, no timers — and is intended to be created once per state slot (a store's cart, a store's list, etc.).

## Key elements

- **`RequestClaim`** (interface) — The token a request receives from `take()`. Calling it returns `true` exactly once if this answer is both the freshest and belongs to the current era, and in that case marks it as applied. The `isSameEra()` method reports whether no reset occurred since the ticket was taken, even if a newer answer already won.
- **`RequestTickets`** (interface) — The public shape returned by the factory: `take()` hands out the next `RequestClaim`; `reset()` kills every outstanding ticket and starts a new era.
- **`createRequestTickets()`** — Factory that returns a fresh `RequestTickets` instance. Internally tracks three counters (`issued`, `applied`, `era`) in a closure. The claim function is built with `Object.assign` so it is both callable and carries the `isSameEra` property.

## Relationships

No graph neighbors are recorded for this file. It is a self-contained utility with no imports; consumers simply call `createRequestTickets()` and use the returned interface.

## Notes

- **Call the claim exactly once per answer.** The first call that returns `true` advances the `applied` pointer; a second call on the same claim will return `false` because `mine <= applied` will now hold.
- **`take()` must be called synchronously at request-send time.** The returned closure captures the current `era` and ticket number in a closure variable; deferring the call changes the semantic.
- **`reset()` bumps `issued` in addition to `era`.** This guarantees that any ticket taken after the reset has a number greater than `applied`, so it can still win. Do not rely on `era` alone for ordering.
- **One instance per state slot.** The module docstring notes that a single `RequestTickets` governs one piece of state; do not share one instance across unrelated state.
