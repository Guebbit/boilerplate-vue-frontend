# src/modules/payments/tests/use-order-refund.spec.ts

## Purpose

Unit tests for the `useOrderRefund` composable. They lock in the contract that the composable makes **no** local refundability decision: the button state is always a passthrough of the server's `actions.refund` flag, and the only client-side guard is an empty order-ID short-circuit.

## Key elements

- **`payment(refund: boolean)`** – factory returning a minimal payment record; toggles `actions.refund` and flips `status` between `'succeeded'` and `'refunded'`.
- **`responses`** – mutable `Record<string, unknown>` mapping `"METHOD /url"` to the response body the mocked transport should resolve with.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a stub that looks up `responses`; unknown keys **reject** with a 404-shaped envelope (`{ success, status, message, errors }`), mirroring the store's real rejection contract.
- **`settled()`** – single microtask yield (`Promise.resolve().then(...)`) so the composable's immediate watcher fetch resolves before assertions read state.
- **Four `it` cases** (under `describe('useOrderRefund')`):
  1. `canRefund` is `true` when the server's `actions.refund` is `true`.
  2. After calling `refund()`, the refreshed record carries `actions.refund: false`, so `canRefund` becomes `false`.
  3. A 404 (no payment record) keeps `canRefund` `false`.
  4. `refund()` with an `undefined` order ID resolves to `undefined` without issuing a request.

## Relationships

No graph neighbors are recorded for this file. It imports `useOrderRefund` from `@/modules/payments` and mocks `@/infrastructure/http`, but neither relationship is tracked in the dependency graph.

## Notes

- The mock rejects with a **plain object**, not an `Error` instance. This is intentional — the API's error envelope *is* the client's rejection contract — and is suppressed with an `eslint-disable` for `@typescript-eslint/prefer-promise-reject-errors`.
- `settled()` yields exactly one microtask. That is sufficient because the composable's immediate watcher performs a single fetch; it is **not** a full `flushPromises`-style drain.
- The 404 path is semantically "no intent was ever created," distinct from a real failure; the store reads `status` off the envelope to tell them apart. The test asserts this distinction by clearing `responses` entirely.
