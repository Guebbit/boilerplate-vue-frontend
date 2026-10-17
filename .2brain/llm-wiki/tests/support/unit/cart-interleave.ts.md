---
source: tests/support/unit/cart-interleave.ts
sha256: 898745be08f7ae6b4a6d152c323b0cbb753307dfd582a67af12d61239f86d970
generated_at: 2026-10-17T02:28:23.102418+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/cart-interleave.ts

## Purpose

Test harness that lets a spec control the order in which mock API responses are delivered to the cart store. Each action started through this module holds its response back behind a gate, so a spec can interleave multiple in-flight requests and choose which one "arrives" first.

## Key elements

- **`CartStore`** — type alias for `ReturnType<typeof useCartStore>`, shared by every consumer.
- **`signInAs(id?)`** — Sets `useSessionStore().viewer` (or clears it) and awaits `nextTick()` so store watchers settle.
- **`Action`** (interface) — Pairs a `vi.mocked` API function with a `run` callback that invokes the corresponding store method.
- **`ACTIONS`** — Record of all cart actions (`add`, `update`, `updateOther`, `remove`, `clear`, `shipping`, `read`) mapped to their mocked `@api` function and store call.
- **`Held`** (interface) — Handle for one in-flight request: a `settled` promise (never rejects) and an `answer(cart)` method that delivers the held response.
- **`issue(store, action)`** — Core helper. Arms the mocked API with a `gate`-held promise, fires the store action, polls until the mock records the call, then returns a `Held` handle so the spec can resolve the answer later.

## Relationships

- **`tests/support/unit/cart-fixtures.ts`** — Supplies `gate` (creates a deferred promise pair) and `answered` (wraps a `CartResponse` in the shape the store expects). `issue` composes both.
- **`src/modules/cart/tests/store-interleavings.spec.ts`, `store-late-answer.spec.ts`, `store-stale-answer.spec.ts`, `store-checkout-key.spec.ts`, `store-stock-poll.spec.ts`** — Primary consumers; they call `issue` with entries from `ACTIONS` to sequence multiple in-flight requests.
- **`src/modules/cart/tests/use-cart-focus-refresh.spec.ts`, `use-cart-stock-poll.spec.ts`** — Consume `signInAs` and `CartStore` (and occasionally `issue`) for composable-store and polling scenarios.

## Notes

- The file **requires** the importing spec to call `vi.mock('@api', …)` with a `vi.fn()` per operation. Because Vitest mocks the module graph, the mock is visible here even though this file does not import the spec.
- `issue` polls `action.api.mock.calls.length` via `vi.waitFor` before returning; the spec is guaranteed the request has been issued but **not** yet answered.
- `settled` is attached with `.catch(() => undefined)` — it exists only to let a spec `await` sequencing; assertions on the action's result belong in the spec.
- `ACTIONS.update` and `ACTIONS.updateOther` both mock `updateCartItemById` but target different product IDs (`'p1'` vs `'p2'`), allowing a spec to interleave two updates to distinct items.
