---
source: src/modules/cart/tests/guest-cart-storage.spec.ts
sha256: d6e1491aa3d2afae2ff789bd34b963f40b5e5861d614bedac3f63b573891528f
signature: d6e1491aa3d2afae2ff789bd34b963f40b5e5861d614bedac3f63b573891528f
generated_at: 2026-11-10T04:05:51.524986+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/guest-cart-storage.spec.ts

## Purpose

Vitest spec for the guest-cart `localStorage` layer. It verifies the read/write round-trip, the 30-day expiration policy, the defensive parsing that tolerates hand-edited or legacy data, and the hard rule that storage failures (blocked, quota-exceeded) are silently swallowed so the visitor never sees an error.

## Key elements

- **`describe('readGuestCart')`** — covers round-trip, empty default, malformed JSON, partial-line filtering, 29-day vs 31-day TTL (and key removal on expiry), legacy bare-array shape, and `SecurityError` on `getItem`.
- **`describe('writeGuestCart')`** — verifies the `{ savedAt, lines }` envelope shape, that an empty cart *removes* the key rather than storing `[]`, and that `QuotaExceededError` / `SecurityError` on `setItem`/`removeItem` do not throw.
- **`describe('the pending merge attempt')`** — round-trips `writeMergeAttempt` / `readMergeAttempt`, confirms `undefined` clears the key, parameterised cases for malformed stored values, and that all three Storage methods can throw without the caller seeing an exception.
- **`describe('a saved guest cart that is not an envelope')`** — parameterised guard: `null`, a number, a string, a bare line object, and an envelope missing `savedAt` all read as `[]`.
- **`beforeEach`** — calls `localStorage.clear()` to guarantee isolation between tests.

## Relationships

- **`src/modules/cart/guest-cart-storage.ts`** — the sole dependency under test. The spec imports `GUEST_CART_STORAGE_KEY`, `GUEST_MERGE_ATTEMPT_STORAGE_KEY`, `readGuestCart`, `readMergeAttempt`, `writeGuestCart`, and `writeMergeAttempt`, exercising their public contracts against a real `localStorage` (with Vitest `vi.spyOn` for fault injection on the Storage prototype).

## Notes

- The 30-day boundary is asserted with concrete `Date.UTC(2026, 9, 19)` anchors plus 29/31-day offsets; there is no `vi.useFakeTimers`—the tests pass an explicit `now` parameter to `readGuestCart` instead.
- The `writeGuestCart(lines, now)` two-argument call is only used in the TTL test; every other call relies on the default timestamp.
- Mocking is done via `vi.spyOn(Storage.prototype, …)` and is **not** restored inside the tests (Vitest's default `restoreMocks` in the project config handles teardown). If the config changes, these spies will leak.
- The "legacy bare list" and "envelope without a time" cases document a deliberate format break: any payload that is not a `{ savedAt, lines }` object is treated as empty, never migrated in place.
