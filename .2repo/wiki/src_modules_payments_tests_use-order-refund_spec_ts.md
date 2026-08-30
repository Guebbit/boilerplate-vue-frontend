# src/modules/payments/tests/use-order-refund.spec.ts

## Purpose

Vitest suite for the `useOrderRefund` composable. It verifies that the refund button's availability is driven entirely by the server's `actions.refund` field on the payment record — the composable decides nothing on its own — and that edge cases (no payment, missing order id) leave the control disabled rather than issuing a broken request.

## Key elements

- **`payment(refund: boolean)`** – factory returning a minimal payment object whose `actions.refund` flag and `status` toggle with the argument.
- **`responses`** – mutable `Record<string, unknown>` holding the mock HTTP responses; each test overwrites it to simulate different server states.
- **`vi.mock('@/infrastructure/http')`** – replaces `orvalMutator` with a stub that looks up `responses` by `METHOD /path`; unmatched keys reject with a 404 error-envelope object (not a `Error` instance) to mirror the API's rejection contract.
- **`settled()`** – single microtask flush (`Promise.resolve().then(() => undefined)`) that lets the composable's immediate watcher fetch resolve before assertions run.
- **`describe('useOrderRefund')`** – four cases:
  - Server says refund open → `canRefund` is `true`.
  - After calling `refund()`, refreshed record shows `refund: false` → `canRefund` is `false`.
  - 404 (no payment exists) → `canRefund` is `false`.
  - `orderId` is `undefined` → `refund()` resolves to `undefined` without hitting the network.

## Relationships

No graph neighbors are listed. The file imports `useOrderRefund` from `@/modules/payments` (the unit under test) and mocks `@/infrastructure/http` to isolate HTTP calls. It also uses `pinia` (`createPinia`, `setActivePinia`) and `vue` (`ref`) in test setup.

## Notes

- The 404 mock rejection is a plain object matching the API's error envelope (`{ success, status, message, errors }`), **not** a thrown `Error`. The store's `onResponseReject` reads `.status` off it; passing a real `Error` here would break that path.
- `responses` is reset in `beforeEach`, so tests are order-independent. The "no payment" test sets it to `{}` to force every lookup into the 404 branch.
- `settled()` only advances one microtask tick; it works because the immediate watcher performs a single fetch. If the composable ever chains multiple awaits, this helper would need updating.
