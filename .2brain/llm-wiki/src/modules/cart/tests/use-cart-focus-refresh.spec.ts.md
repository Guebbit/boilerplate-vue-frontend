---
source: src/modules/cart/tests/use-cart-focus-refresh.spec.ts
sha256: 518eb85c28bd34c12db1d93d113c2a5e992125961b2bc2955fe1c31820f50492
signature: fa96b8197991b0c26b9078d38800f41e94a5061de9469b8678eab649d943f324
generated_at: 2026-11-10T04:12:42.086887+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/use-cart-focus-refresh.spec.ts

## Purpose

Unit tests for the `useCartFocusRefresh` composable. Verifies the cart page's refresh-on-return contract: a window focus or tab becoming visible triggers exactly one `getCart` read, a tab going hidden triggers none, an in-flight write is never overwritten by a read, and all listeners are torn down when the page scope is disposed.

## Key elements

- **`openPage()`** — Simulates mounting the cart page: creates a Vue `effectScope`, runs `useCartFocusRefresh` inside it, and returns the active `useCartStore` instance for assertions.
- **`setVisibility(state)`** — Spies on the `document.visibilityState` getter (mocking the value) and dispatches a `visibilitychange` event, mimicking browser behavior.
- **`describe('coming back to the cart page')`** — Five cases covering focus-read, visibility-read, hidden-no-read, in-flight-write guard, and listener cleanup after scope stop.
- **`vi.mock('@api', …)`** — Replaces the entire `@api` module with `vi.fn()` stubs so no network calls occur.
- **`wireModulesIntoCore()`** — Wires the cart module into the shared core test harness before any tests run.

## Relationships

- **`src/modules/cart/composables/use-cart-focus-refresh.ts`** — The system under test; its focus/visibility listeners and in-flight guard are what the assertions target.
- **`src/modules/cart/store.ts`** — Supplies `useCartStore`; tests read the store's cart items and dispatch actions through it.
- **`src/modules/cart/tests/cart-fixtures.ts`** — Provides the `aCart([['p1', 2]])` fixture used as the default `getCart` mock return value.
- **`src/modules/cart/tests/cart-interleave.ts`** — Supplies `issue()` and the action constants used to stage an in-flight write whose settlement is controlled by the test.
- **`tests/support/unit/async-answers.ts`** — Provides `answered()` to wrap fixture data in the promise shape the composable expects.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()` to register the cart module with the shared Pinia/Vue test environment.

## Notes

- Listeners are attached to `globalThis` (focus) and `document` (visibilitychange); the cleanup test dispatches both events *after* `scope.stop()` and asserts zero calls, confirming the composable unregisters on scope disposal.
- The in-flight-write test uses `issue()` from `src/modules/cart/tests/cart-interleave.ts` to open a pending write, then dispatches focus *before* answering the write — the composable must skip the read while the write is unresolved.
- `vi.waitFor` (Vitest polling assertion) is used instead of plain `await` because the read is event-driven and there is no explicit promise to await.
- `localStorage.clear()` runs in `beforeEach`, suggesting the store or a dependency persists state there; tests must start from a clean slate.
