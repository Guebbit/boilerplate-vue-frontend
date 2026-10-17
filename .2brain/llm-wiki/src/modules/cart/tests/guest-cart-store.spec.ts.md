---
source: src/modules/cart/tests/guest-cart-store.spec.ts
sha256: eefd98135155077cc86a82642edd1de7ea0f058ca46d3ae85a4d6fbea0497815
generated_at: 2026-10-17T00:40:33.946892+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-store.spec.ts

## Purpose

Vitest spec for the guest-cart half of the cart Pinia store. It verifies the full lifecycle of a signed-out visitor's list: local CRUD and `localStorage` persistence, cross-tab synchronisation via `StorageEvent`, the badge count, `mergeGuestCart` (success, partial-change, and failure paths), and `seedAfterSignIn` (merge-vs-summary dispatch, and the distinct toast messaging for client-side 4xx vs. server-side 5xx refusals). The generated API client is fully mocked, and every canned response is validated against its Orval response schema before being served.

## Key elements

- **`RESPONSES`** – Canned API answers (`merged`, `mergedWithChanges`, `mergedAgain`, `summary`, `cart`), each wrapped in `contractEnvelope` so the shape is checked against the corresponding `@api/schemas` type at module load time.
- **`MERGED_CART`** – The single `cart` object embedded inside most canned responses (one line, 3 units, EUR).
- **`vi.mock('@api', …)`** – Replaces `getCart`, `getCartSummary`, `mergeCart` with `vi.fn()` resolvers that return the entries in `RESPONSES`.
- **`wireModulesIntoCore()`** – One-time call at module scope that registers the i18n, session, and notification modules so the store under test can resolve them.
- **`trackStores()` → `{ fresh, disposeAll }`** – Factory that creates a fresh Pinia store per test and tracks instances so `afterEach` can `$dispose` them (removing the `StorageEvent` listener).
- **`otherTabSaves(lines, key?)`** – Helper that writes (or clears) `localStorage` under `GUEST_CART_STORAGE_KEY` and dispatches a `StorageEvent`, simulating another tab's write.
- **`describe('the guest list')`** – Covers persistence from a prior visit, no-network mutations, the 100-line cap on `addGuestItem`, removal, `clearGuestCart`, badge count, and badge yielding to the server summary.
- **`describe('another tab changing the guest cart')`** – Covers takeover of state, takeover on clear, ignoring unrelated keys, and listener cleanup after `$dispose`.
- **`describe('mergeGuestCart')`** – Covers single-call merge, guest-cart + storage emptying on success, partial-change/refused-line reporting, and guest-cart preservation on a 500 rejection.
- **`describe('seedAfterSignIn')`** – Covers summary-only path (no guest lines), merge path (guest lines present), 4xx "cleared from this device" toast path (parametrised over 400/413/422), and 5xx "stays on this device" toast path.

## Relationships

- **`contracts/rest/index.ts`** – Source of the `getCart`, `getCartSummary`, `mergeCart` functions and the `schemas.*` response types; the spec mocks the functions and validates fixtures against the schemas.
- **`src/modules/cart/composables/guest-cart-storage.ts`** – Exports `GUEST_CART_STORAGE_KEY` and `GUEST_MERGE_ATTEMPT_STORAGE_KEY`, the `localStorage` keys the tests read/write and assert on.
- **`tests/support/unit/cart-fixtures.ts`** – Provides the `apiRejection` helper (constructs a typed `Error` with a status code) and the `Answer<T>` generic type used in `contractEnvelope` calls.
- **`tests/support/unit/track-stores.ts`** – Provides `trackStores()`, the store-factory + disposal tracker used in every test.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called once at module scope to register i18n, session, and notification dependencies before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `contractEnvelope`, which runtime-validates a fixture object against a given schema class before returning it.

## Notes

- The `vi.mock('@api', …)` factory closes over the `RESPONSES` object; per-test overrides use `vi.mocked(fn).mockResolvedValueOnce(…)` or `.mockRejectedValueOnce(…)`, which the default factory's `vi.fn(() => …)` still backs.
- `wireModulesIntoCore()` is called at **module top level** (outside any `beforeEach`), so it runs exactly once regardless of test count. The `loadLocale('en')` call inside `beforeEach` is separate and idempotent.
- The cross-tab tests rely on the real `globalThis` `StorageEvent`; no custom event polyfill is needed because the store registers a standard `storage` listener.
- The 4xx "cleared" path asserts the toast says "cleared from this device" and explicitly asserts it does **not** say "stays on this device", distinguishing it from the 5xx path.
- The 100-line cap test fills `guestLines` by direct assignment (`store.guestLines = Array.from(…)`) to bypass the cap on add; this is the only test that mutates the array property directly rather than through an action.
