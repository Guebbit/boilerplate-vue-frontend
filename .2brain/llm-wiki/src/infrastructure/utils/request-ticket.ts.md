---
source: src/infrastructure/utils/request-ticket.ts
sha256: 53246d1ab1654506957b08c7bb7d1a96e4e7dcc5bdc7d6a0f4ba4dbacbea4c35
generated_at: 2026-10-17T00:13:13.742277+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/request-ticket.ts

## Purpose

A pure ticket-ordering utility that guarantees only the newest answer for a given piece of state is applied. Each outgoing request takes a ticket; when its response arrives, the ticket claims whether it is still the freshest (and in the same "era"). A `reset` barrier invalidates all prior tickets, preventing a stale response from a previous context (e.g., a prior user) from overwriting the current one. No Vue, no timers.

## Key elements

- **`RequestClaim`** (interface) — a callable object returned by `take()`. Calling it returns `true` and marks the answer as the newest applied, or `false` if a fresher answer already won or a reset occurred. The attached `isSameEra()` method reports whether a reset happened after the ticket was taken (i.e., the answer is still for the same "person"/context).
- **`RequestTickets`** (interface) — the ordering object for one piece of state. Exposes `take()` (get next ticket, call synchronously at request-send time) and `reset()` (kill all outstanding tickets, start a new era).
- **`createRequestTickets()`** (exported const) — factory that returns a `RequestTickets` instance. Internally tracks three counters: `issued` (next ticket number), `applied` (newest applied ticket), and `era` (reset count). Uses `Object.assign` to attach `isSameEra` to the claim function so the claim is a single callable.

## Relationships

No dependency-graph neighbors recorded.

## Notes

- The claim callable must be invoked **at most once** per response; calling it twice would double-apply.
- `reset()` increments both `era` and `issued` and sets `applied = issued`, so any ticket with `mine <= applied` or `mineEra !== era` is permanently dead.
- Ordering is a simple integer comparison (`mine > applied`), not a timestamp — safe against clock skew.
- The file is explicitly pure: it can be unit-tested without a Vue app or fake timers.
- One `RequestTickets` instance corresponds to exactly one piece of state (one cart, one list, etc.). Do not share an instance across unrelated stores.
