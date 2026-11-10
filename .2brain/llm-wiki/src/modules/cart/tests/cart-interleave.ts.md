---
source: src/modules/cart/tests/cart-interleave.ts
sha256: 1ed0ccfe308d2e480557eeb8f79cd660e2617cce0cefca807f33e01ae67930db
signature: 752094bbf0cd64626a561e441ce5457af10342233c8687c4231a16e4b3f2f7e7
generated_at: 2026-11-10T04:01:23.411865+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/cart-interleave.ts

## Purpose

A shared test helper that lets a spec fire cart store actions while holding back their network answers, so the spec controls the order in which responses are delivered. This enables deterministic testing of interleaved, concurrent, or out-of-order cart API calls.

## Key elements

- **`CartStore`** — Type alias for `ReturnType<typeof useCartStore>`; the canonical store type used across interleave specs.
- **`signInAs(id?)`** — Sets or clears `useSessionStore().viewer` and awaits `nextTick()` so watchers settle before the test proceeds.
- **`Action`** (interface) — Pairs a mocked `@api` client function (`.mock.calls`, `.mockReturnValueOnce`) with a `run(store)` callback that triggers the corresponding store action.
- **`ACTIONS`** — A `Record<string, Action>` mapping (`add`, `update`, `updateOther`, `remove`, `clear`, `shipping`, `read`) covering every cart store mutation/read. Each entry wraps the already-`vi.mocked` API function.
- **`Held`** (interface) — Returned by `issue`; holds the never-rejecting `settled` promise for the store action and an `answer(cart)` resolver that delivers the server response.
- **`issue(store, action)`** — Arms `action.api.mockReturnValueOnce` with a gated promise (from `gate`), invokes the store action, waits via `vi.waitFor` until the mock call is recorded, and returns the `Held` handle.

## Relationships

- **`src/modules/cart/store.ts`** — Imports `useCartStore` (type-only) to derive `CartStore`; `issue` drives the store's action methods.
- **`tests/support/unit/async-answers.ts`** — Imports `gate` (deferred-promise factory) and `answered` (wraps a `CartResponse` into the `Answer` envelope the store expects).
- **Sibling spec files** (e.g. `store-interleavings.spec.ts`, `store-add-key.spec.ts`, `store-late-answer.spec.ts`, `use-cart-stock-poll.spec.ts`) — Downstream consumers that import `ACTIONS`, `issue`, `signInAs`, and `CartStore` to build interleaving scenarios.

## Notes

- This file is only safe to import from a spec that has already called `vi.mock('@api', …)`. Because `vi.mock` mocks the module graph (not just the importing file), the mocks are visible here too.
- `issue` returns a `settled` promise that swallows rejections (`.catch(() => undefined)`) so an unhandled store error doesn't crash the spec; assertions on state are the spec's responsibility.
- `update` and `updateOther` both call `updateCartItemByProductId`; they differ only in the product-id argument (`'p1'` vs `'p2'`), allowing a spec to gate two distinct logical updates behind the same mock.
- `vi.waitFor` inside `issue` polls until `mock.calls.length` increments, guaranteeing the request has "left" before the spec can proceed with the next action.
