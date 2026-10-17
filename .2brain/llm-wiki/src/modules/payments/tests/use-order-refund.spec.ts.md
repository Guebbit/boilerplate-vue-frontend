---
source: src/modules/payments/tests/use-order-refund.spec.ts
sha256: 42dc2c24b3eebafce72a386a759adbf7a46e028e98fc35e67073ed0120fefa53
generated_at: 2026-10-17T01:26:23.757998+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/use-order-refund.spec.ts

## Purpose

Vitest spec for the `useOrderRefund` composable. It pins the single behavioral contract of the payments refund control: `canRefund` is a pure read-back of the server's `actions.refund` field, so the button state is always driven by the API response rather than any client-side status logic.

## Key elements

- **`payment(refund: boolean)`** — factory that returns a full payment object with `actions.refund` set to the given flag; used as the fixture payload for both the initial fetch and the post-refund response.
- **`responses`** — module-level `Record<string, unknown>` holding canned HTTP replies keyed by `"METHOD /url"`; each test overwrites it before acting.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that looks up `responses`; a missing key rejects with a 404-shaped envelope (not a `JS Error`), matching the store's `onResponseReject` contract.
- **`settled()`** — a single-microtask flush (`Promise.resolve().then(…)`) that lets the composable's immediate watcher fetch resolve before assertions read `canRefund`.
- **Test cases** (four):
  - *offers the refund the server says is open* — `canRefund` is `true` when `actions.refund` is `true`.
  - *withdraws the control once the money is back* — after calling `refund()`, the refreshed record carries `refund: false`, so `canRefund` flips to `false`.
  - *offers nothing at all when the order has no payment* — clearing `responses` to `{}` triggers the 404 path; `canRefund` stays `false`.
  - *does nothing without an order id rather than calling a broken url* — passing `ref(undefined)` as the order id short-circuits `refund()` to return `undefined`.

## Relationships

- **`src/modules/payments/composables/use-order-refund.ts`** — system under test; imported as `useOrderRefund` and exercised directly in every test.
- **`tests/support/unit/wire-modules.ts`** — imported as `wireModulesIntoCore`; called once at module top-level to register the Pinia store bindings the composable depends on.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload into the API response envelope) and `parseOrvalFixture` (normalizes the fixture into the shape the composable/store expects).

## Notes

- The 404 rejection is a **plain object**, not a `JS Error`. This mirrors the real API error envelope that the store's `onResponseReject` handler reads; the `eslint-disable` comment documents the intent.
- `settled()` is a single microtask tick, not a timer wait. It is sufficient because the composable's immediate watcher performs an async fetch that resolves within the same microtask queue; no `setTimeout` or `vi.useFakeTimers` is needed.
- `responses` is **mutated in place** by individual tests (e.g. the "no payment" test sets it to `{}`), so tests are not isolated by `beforeEach` reassignment alone — the `beforeEach` only resets to the default two-key map.
