---
source: src/modules/cart/domain/stock-poll.ts
sha256: 9429ff09a42eef1e1167f31f7aa784e801edf755742310e124426d8d74853f3a
generated_at: 2026-10-17T00:36:17.228748+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/domain/stock-poll.ts

## Purpose

Defines the single rule for the cart stock-polling interval: how a raw environment string maps to a valid timer delay (or "off"). It is deliberately pure—no timer is started and no environment is read here—so the validation logic can be unit-tested in isolation.

## Key elements

- **`MAX_TIMER_MS`** (private) — Upper bound of a browser `setTimeout` value (2³¹ − 1 ms). Values above this are rejected rather than allowed to fire immediately.
- **`stockPollIntervalMs(raw: string | undefined): number | undefined`** (exported) — Converts the `VITE_CART_STOCK_POLL_SECONDS` value to milliseconds. Returns `undefined` for "no polling" when the input is unset/blank, non-numeric, fractional, zero, negative, or would exceed `MAX_TIMER_MS`.

## Relationships

- **`src/modules/cart/domain/index.ts`** — Re-exports this module as part of the cart domain barrel, making `stockPollIntervalMs` importable without the full path.
- **`src/modules/cart/composables/use-cart-stock-poll.ts`** — Consumer composable that calls `stockPollIntervalMs` to decide whether to schedule a poll and at what delay.
- **`src/modules/cart/tests/stock-poll-interval.spec.ts`** — Unit tests exercising the validation branches of `stockPollIntervalMs`.

## Notes

- Input validation uses a strict `\d+` regex on the trimmed string. This intentionally rejects forms that `Number()` would otherwise accept (hex `0x10`, scientific `1e1`, leading `+`).
- "Off" is the default: any value that is not a plain positive whole number of seconds resolves to `undefined`, not a fallback. There is no implicit polling.
- The function never throws; all invalid cases fall through to `undefined`.
