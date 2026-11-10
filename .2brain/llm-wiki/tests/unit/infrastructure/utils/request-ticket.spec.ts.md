---
source: tests/unit/infrastructure/utils/request-ticket.spec.ts
sha256: 4882de0e318c05733dca09d15ffcb7226a6e4a3a9c74905afe455a1c9b3dda40
signature: 4882de0e318c05733dca09d15ffcb7226a6e4a3a9c74905afe455a1c9b3dda40
generated_at: 2026-11-10T08:06:55.043152+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/request-ticket.spec.ts

## Purpose

Unit tests for `createRequestTickets`, verifying that the ticket-based ordering guarantees hold regardless of network delivery order: the latest request's answer always wins, a reset invalidates all prior-era tickets, and the first answer of a new era applies cleanly.

## Key elements

- **`createRequestTickets`** (imported from `@/infrastructure/utils/request-ticket.ts`) — the factory under test; returns an object with `take()` and `reset()` methods.
- **`take()`** — returns a *ticket* (a callable). Calling the ticket attempts to apply that request's answer; it returns `true` if applied, `false` if superseded or reset. Also exposes `isSameEra()` to check whether the ticket belongs to the current era.
- **`reset()`** — invalidates every ticket issued before it, starting a new era.
- **Property-based test** (via `fast-check`) — asserts that for any permutation of 5 tickets, the set of applied indices is strictly increasing and always includes the highest index, guaranteeing the freshest request wins.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The deterministic tests use `seed: 20_261_005` in the `fc.assert` call; changing the seed may surface different permutations.
- `isSameEra()` is intentionally still `true` for a ticket whose *answer* was superseded by a newer ticket in the same era — it only flips to `false` after a `reset()`. This distinction is easy to conflate.
- The tests call tickets as plain functions (`ticket()`) rather than through an explicit `.apply()` method; the API surface is a callable object.
