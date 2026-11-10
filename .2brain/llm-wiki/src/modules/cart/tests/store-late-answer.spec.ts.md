---
source: src/modules/cart/tests/store-late-answer.spec.ts
sha256: c565f89575bf0236e3d44502cdbf0f1a7b738b46d8cc654a3ba9aa9bca57d9ab
signature: 6f6fd05926b26c6c100c37b553956bd50bcb2d395023146cff9bf555a7e594a5
generated_at: 2026-11-10T04:11:04.007887+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/store-late-answer.spec.ts

## Purpose

Verifies that the cart store's per-person reset acts as a hard barrier for in-flight API requests. When person A initiates a request and the tab subsequently passes to person B (or to no one after logout), the late-arriving answer must not populate B's cart, badge, or merge report. This guards against cross-session data leakage in a multi-person tab.

## Key elements

- **`it.each` (4 cases)** — Covers late arrival of a cart read, a quantity update, an add-to-cart, and a shipping-method pick. Each signs in as `a`, fires a tracked request via `issue`, switches to `b`, then resolves the request and asserts `store.cart` and `store.badgeQuantity` remain `undefined`.
- **`it` – late cart read after logout** — Same pattern but the tab goes to *nobody* (`signInAs()` with no argument); asserts `store.cart` is `undefined`.
- **`it` – late badge read** — Uses the `gate`/`answered` helpers to defer the `getCartSummary` promise directly on the store (`store.fetchSummary()`), then resolves it after switching to `b`; asserts `badgeQuantity` is `undefined`.
- **`it` – late merge report** — Adds a guest item, fires `store.mergeGuestCart()`, defers the `mergeCart` promise via `gate`, switches to `b`, resolves with a full merge answer, and asserts both `store.cart` is `undefined` and `store.mergeReport` is `[]`.
- **`vi.mock('@api', …)`** — Replaces every exported API function with a bare `vi.fn()` stub so no real network calls are made; individual tests override specific functions with `mockReturnValueOnce`.
- **`beforeEach`** — Clears `localStorage`, installs a fresh Pinia instance, and resets all mocks.
- **`afterEach`** — Disposes every tracked store via `disposeAll()`.

## Relationships

- **`cart-fixtures.ts`** — Supplies the `aCart` factory used to build synthetic cart payloads for answers.
- **`cart-interleave.ts`** — Provides `ACTIONS` (a map of action dispatchers), `issue` (starts a request and returns a tracked handle), and `signInAs` (switches the active person on the store).
- **`track-stores.ts`** — Provides `trackStores()`, which returns a `fresh` factory and a `disposeAll` cleanup function for managing Pinia store lifetimes across tests.
- **`async-answers.ts`** — Provides the `gate` helper (creates a deferred promise + resolver pair), the `answered` wrapper, and the `Answer<T>` type used to shape API responses for deferred delivery.
- **`wire-modules.ts`** — Provides `wireModulesIntoCore()`, called once at module scope to register the cart module into the application core so stores resolve their dependencies.

## Notes

- The `gate`/`answered` pattern is used for the badge and merge tests because those calls are invoked directly on the store method rather than through the `issue` helper from `cart-interleave.ts`. The `issue` helper handles the four action-dispatch cases.
- `store.fetchSummary()` and `store.mergeGuestCart()` are called with `.catch(() => undefined)` so a rejected promise (expected when the store resets mid-flight) does not produce an unhandled-rejection warning.
- The merge test uses `vi.waitFor` to confirm `mergeCart` was actually called before resolving the gate, avoiding a race where the assertion runs before the store has registered the in-flight request.
