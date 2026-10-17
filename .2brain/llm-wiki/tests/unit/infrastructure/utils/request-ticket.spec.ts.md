---
source: tests/unit/infrastructure/utils/request-ticket.spec.ts
sha256: 94c2a37514c8d5dc5ce9b478f48170ae150601dcd805eb1e64640d79ade4f9d4
generated_at: 2026-10-17T02:39:42.371536+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/request-ticket.spec.ts

## Purpose

Vitest spec for the `createRequestTickets` utility. It verifies the ticket-ordering contract: a later request's answer always wins over an earlier one regardless of network delivery order, a `reset()` invalidates all prior-era tickets, and the first answer of a new era applies cleanly.

## Key elements

- **`createRequestTickets` (imported from `@/infrastructure/utils/request-ticket.ts`)** — the unit under test. Returns an object exposing:
  - `take()` → a *ticket* (a zero-arg callable that returns `true` if the caller's answer should be applied, `false` otherwise).
  - `reset()` → discards all previously issued tickets and starts a fresh era.
  - `ticket.isSameEra()` → boolean indicating whether the ticket belongs to the current post-reset era.

- **Property-based test** (`fc.assert` + `fc.shuffledSubarray`) — asserts that for *any* permutation of 5 ticket deliveries, the set of applied ticket indices is strictly increasing and always ends at the latest index (4). Uses a fixed seed (`20_261_005`) and 100 runs.

## Relationships

- Imports the single SUT `createRequestTickets` from `@/infrastructure/utils/request-ticket.ts`. No other project files are referenced.
- Depends on **vitest** (test runner) and **fast-check** (property-based testing).

## Notes

- The ticket returned by `take()` is both a *function* (call it to apply/claim) and carries an `isSameEra()` method — tests rely on both aspects.
- The property-based test's `seed` is hardcoded for reproducibility; changing it will generate a different set of permutations.
- "Era" is the unit's term for the window between two `reset()` calls; a ticket that lost to a newer ticket in the *same* era still reports `isSameEra() === true`.
