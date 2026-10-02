---
source: src/modules/payments/tests/use-order-refund.spec.ts
sha256: c083d9d2fd243946114e6d35a44a19d7b0e012e7e2886539a3c3dbc858f66153
generated_at: 2026-10-02T15:32:06.820561+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/use-order-refund.spec.ts

## Purpose

Vitest spec for the `useOrderRefund` composable. It pins the contract that the composable makes **no client-side refund decision**: `canRefund` is a pure read-back of the server's `actions.refund` flag, so the control state follows whatever the API returns without any local status comparison.

## Key elements

- **`payment(refund: boolean)`** — factory returning a minimal payment record; toggles `actions.refund`, `status`, and `amountRefunded` so tests can simulate "open" vs "already refunded" states.
- **`responses`** — mutable record (`Record<string, unknown>`) of stubbed HTTP envelopes keyed by `"METHOD /path"`. Reset in `beforeEach`; the 404 test overwrites it with `{}`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator`. Unknown keys reject with a 404-shaped plain-object envelope (matching the client's error-rejection contract); known keys resolve via `parseOrvalFixture`.
- **`settled()`** — a single microtask flush (`Promise.resolve().then(() => undefined)`) that lets the composable's immediate-watcher fetch resolve before assertions read the result.
- **`describe('useOrderRefund')`** — four cases:
  1. `canRefund` is `true` when the server record has `actions.refund: true`.
  2. After calling `refund()`, the refreshed record carries `refund: false`, so `canRefund` flips to `false`.
  3. A 404 (no stub) means no payment exists → `canRefund` stays `false`.
  4. `refund()` with an undefined order id returns `undefined` without issuing a request.

## Relationships

- **`src/modules/payments/composables/use-order-refund.ts`** — the unit under test; imported as `useOrderRefund` and exercised with a `ref('o1')` (or `ref(undefined)`) order-id input.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level to register DI providers so the composable's internal dependencies (Pinia store, HTTP client) resolve.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a payload into the Orval response envelope) and `parseOrvalFixture` (validates/parses a stub body), both used by the HTTP mock.

## Notes

- The 404 rejection is a **plain object**, not an `Error` instance. An eslint-disable comment documents this as intentional: the API's error *envelope* is the client's rejection contract, and the store's `onResponseReject` reads `.status` off it.
- Tests use `return` + `.then()` chains rather than `await`. This is a deliberate style choice (no top-level `async` in the `it` callbacks).
- `settled()` is only a single microtask. That is sufficient here because the composable performs exactly one immediate-fetch; adding more awaits would be overkill.
- The `responses` map is shared mutable state cleared per test via `vi.clearAllMocks()` in `beforeEach`; tests that need a different scenario (e.g. the 404 case) reassign it directly.
