---
source: tests/support/unit/cart-fixtures.ts
sha256: 35858a28f85573810b3c05b043ac48b737c6022bd5b62a5347d0f9e8bb1fc293
generated_at: 2026-10-17T02:28:10.564012+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/cart-fixtures.ts

## Purpose

Typed factories and small helpers for cart test specs that interleave or hold back API answers by hand. It builds whole `CartResponse` objects from their lines (so totals are always consistent with line quantities) and provides the envelope shapes the generated client and HTTP layer expect, letting specs assert on complete carts rather than hand-copied numbers.

## Key elements

- **`UNIT_PRICE`** (const, `10`) — the unit price every fixture line carries; totals are `units * UNIT_PRICE`.
- **`aCart(lines, selected?, short?)`** — builds a valid `CartResponse` from `[productId, quantity]` pairs, an optional selected shipping-method id, and optional ids to mark `insufficient_stock`. Derives `summary` totals and `shipping` options consistently from the inputs.
- **`Answer<TCall>`** (type) — `Awaited<ReturnType<TCall>>`; extracts the resolved payload type of a generated-client call so a held answer is typed by the call it answers.
- **`answered<TData>(data)`** — wraps `data` in the success envelope (`success: true, status: 200, message: 'OK', data`) the generated client resolves with.
- **`Gate<T>`** (interface) — `{ promise, resolve, reject }`; the three pieces a test needs to settle a held call manually.
- **`gate<T>()`** — creates a `Gate<T>` via `Promise.withResolvers`; the single way a spec holds an answer back.
- **`apiRejection(status, code)`** — the rejection envelope the app's HTTP layer throws for a non-success response (not an `Error`; an object with `success: false`, `status`, `message`, `errors[]`).
- **`lostAnswer()`** — a plain `new Error('Network Error')`, representing a request that never received an answer.

## Relationships

All 15 graph neighbors are spec files under `src/modules/cart/tests/` (e.g. `cart-view-double-submit.spec.ts`, `store-interleavings.spec.ts`, `guest-cart.property.spec.ts`). Each imports one or more of the exports above to:

- Build fixture carts with `aCart` instead of hand-writing the full response shape.
- Hold back and sequence API answers using `gate` / `Gate`.
- Wrap payloads with `answered` or reject with `apiRejection` / `lostAnswer` to match the runtime envelope the SUT expects.
- Use `Answer<TCall>` to type the value a mocked call is expected to resolve with.

## Notes

- `SHIPPING_OPTIONS` is module-private; specs get it implicitly through `aCart` and cannot override the option list.
- `shipping.required` and `shipping.options` are derived from `lines.length > 0` — an empty cart has no shipping section.
- `apiRejection` and `lostAnswer` produce different shapes (object vs. `Error`); the SUT's HTTP layer distinguishes them, so a spec must use the correct one for the failure mode under test.
- `gate` uses `Promise.withResolvers` (ES 2024+); the project must target that baseline or provide a polyfill.
