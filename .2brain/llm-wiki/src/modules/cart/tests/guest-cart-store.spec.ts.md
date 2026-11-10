---
source: src/modules/cart/tests/guest-cart-store.spec.ts
sha256: 0a95161c0f88c7ac7b4596d56dff3c5e33815d476638d76bc7ea46e990137985
signature: c4766f90ab119fca33b75691db53f7038485e79344a797ebbb26e4c97dbf5f0f
generated_at: 2026-11-10T04:06:23.555691+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-store.spec.ts

## Purpose

Unit tests for the guest-cart half of the cart Pinia store: what a signed-out visitor can add/remove, how lines persist in `localStorage`, how cross-tab changes propagate via `StorageEvent`, how `mergeGuestCart` sends all lines to the server and clears local state, and how `seedAfterSignIn` decides between merging and simply reading a summary. All generated API calls are mocked with responses validated against their OpenAPI response schemas.

## Key elements

- **`MERGED_CART`** – static fixture representing the server's cart after a merge; reused across response bodies.
- **`RESPONSES`** – canned return values for `getCart`, `getCartSummary`, and `mergeCart`, each built through `contractBody` so the shape is proven against the corresponding `@api/schemas` type at test-definition time.
- **`vi.mock('@api', …)`** – replaces the generated client with the canned responses above; individual tests can override a single call via `mockResolvedValueOnce` / `mockRejectedValueOnce`.
- **`trackStores()` / `freshStore` / `disposeAll`** (from `./track-stores.ts`) – factory that creates a fresh Pinia store per test and disposes all instances in `afterEach`.
- **`otherTabSaves(lines, key?)`** – helper that writes/removes the guest-cart key in `localStorage` and dispatches a `StorageEvent` on `globalThis` to simulate another tab.
- **`describe('the guest list')`** – CRUD on `guestLines`, capacity limit (100 lines), badge quantity (asserted via `toBeUndefined` when empty, unit count otherwise, server count after `fetchSummary`).
- **`describe('another tab changing the guest cart')`** – takeover on `GUEST_CART_STORAGE_KEY` events, ignoring other keys, and stopping listeners after `$dispose`.
- **`describe('mergeGuestCart')`** – single `mergeCart` call with all lines, local + storage clearing on success, preservation on rejection, and handling of "changed/refused" line reports.
- **`describe('seedAfterSignIn')`** – no-merge path (just `getCartSummary`), merge-when-guest-lines-exist path, 4xx rejection (drops guest cart, toast says "cleared from this device"), 5xx rejection (keeps guest cart, toast says "stays on this device").
- **`wireModulesIntoCore()`** (from `wire-modules.ts`) – called at module scope to register i18n/other side-effects before any test runs.

## Relationships

- **`src/modules/cart/guest-cart-storage.ts`** – source of `GUEST_CART_STORAGE_KEY`, `GUEST_MERGE_ATTEMPT_STORAGE_KEY`, `readGuestCart`, `writeGuestCart`; the test exercises the store's use of these helpers and asserts on the raw `localStorage` key directly.
- **`src/modules/cart/tests/track-stores.ts`** – provides `trackStores()` which returns `{ fresh, disposeAll }`; the test calls `freshStore()` in every case and `disposeAll()` in `afterEach`.
- **`tests/support/unit/orval-fixture-schema.ts`** – provides `contractBody`, which validates a response object against the generated schema and narrows it to `Answer<Fn>`.
- **`tests/support/unit/async-answers.ts`** – provides `apiRejection(status, code)` for building rejected-API fixtures and the `Answer` type used in `RESPONSES`.
- **`tests/support/unit/fixtures.ts`** – provides `aProblem` (used in truncated error-path assertions for `seedAfterSignIn`).
- **`tests/support/unit/wire-modules.ts`** – provides `wireModulesIntoCore()`, called once at import time to make `loadLocale` and other module-level side-effects available.
- **`contracts/rest/index.ts`** – the `@api` alias (mocked here) resolves to the generated REST client whose operation signatures and schemas originate from the contract definitions; `contractBody` ties each canned response back to the matching contract operation.

## Notes

- `wireModulesIntoCore()` runs at **module evaluation** (top-level), not inside a `beforeEach`; if a future test relies on locale or module registration, it is already in effect before `vi.mock` hoisting settles.
- The badge quantity is asserted with `toBeUndefined()` (not `toBe(0)`) when the guest cart is empty – a deliberate convention to distinguish "no data yet" from "zero items."
- Cross-tab simulation dispatches `StorageEvent` on `globalThis` (not `window`), matching how the production store listens; tests that call `store.$dispose()` verify the listener is removed.
- The 100-line capacity test fills `guestLines` by direct assignment (`store.guestLines = …`) rather than 100 `addGuestItem` calls, to avoid O(n²) overhead and to test the cap independently of the add path.
- `seedAfterSignIn` error-path tests use `useNotificationsStore().messages` to assert toast content; the store must be in the active Pinia instance (set in `beforeEach`).
