---
source: src/modules/cart/domain/stock-poll.ts
sha256: 9429ff09a42eef1e1167f31f7aa784e801edf755742310e124426d8d74853f3a
signature: aefef4c6254fb81e0ef1815305ad2bdf79669c2be5fd8aaf52de1f1eb5e77dc8
generated_at: 2026-11-10T03:58:09.558901+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/stock-poll.ts

## Purpose

Pure validation logic for the cart's optional stock-poll interval. It translates the raw `VITE_CART_STOCK_POLL_SECONDS` env value into a timer-safe millisecond delay, or returns `undefined` to signal "polling is off." It reads no environment, starts no timer, and never guesses a default—anything that is not a plain positive whole number of seconds is treated as disabled.

## Key elements

- **`stockPollIntervalMs(raw: string | undefined): number | undefined`** — The sole export. Accepts the raw env string (possibly `undefined`), trims it, validates via a digits-only regex (`/^\d+$/`), converts to seconds, multiplies by 1000, and checks against `MAX_TIMER_MS`. Returns the delay in ms, or `undefined` for every invalid case.
- **`MAX_TIMER_MS`** (`2 147 483 647`) — Module-private constant; the maximum signed 32-bit ms value a browser timer honours. Delays exceeding this are rejected rather than clamped.

## Relationships

- **`src/modules/cart/composables/use-cart-stock-poll.ts`** — Consumes `stockPollIntervalMs` to decide whether and how often to schedule the actual stock-check request.
- **`src/modules/cart/domain/index.ts`** — Barrel file that re-exports this module so callers can import from the domain namespace.
- **`src/modules/cart/tests/stock-poll-interval.spec.ts`** — Unit tests covering the validation branches (valid numbers, blank, non-numeric, zero, overflow, hex/scientific-notation rejection).

## Notes

- Validation is deliberately stricter than `Number()`: the digits-only regex rejects hex (`0x10`), scientific notation (`1e1`), and sign-prefixed strings (`+5`). Do not "simplify" to a numeric parse without accepting those forms.
- The `undefined` return (not `0` or `null`) is the canonical "off" signal. Downstream code should check with `== null` or an explicit `=== undefined` guard.
- Overflow is handled by returning `undefined`, not by capping to `MAX_TIMER_MS`—a poll that would exceed the timer ceiling is treated as misconfigured and disabled rather than silently accelerated.
