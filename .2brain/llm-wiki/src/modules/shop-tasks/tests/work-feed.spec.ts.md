---
source: src/modules/shop-tasks/tests/work-feed.spec.ts
sha256: 6378b8af5a6d8b83533eff7301fd26d0649581dbcb4ab12c8f610f1c54e09405
signature: 2d250349cee6caf59c0216cd850f7555c0c986237629ad09717f0a50a6e492a8
generated_at: 2026-11-10T05:44:29.460482+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop-tasks/tests/work-feed.spec.ts

## Purpose

Vitest spec for the `useShopWorkFeed` composable. Verifies the staff-nav badge feed contract: a staff member with `display` ability triggers a **passive** `GET /shop-tasks/summary`, a buyer triggers none, a route change within the minute reuses the cached answer, a staff inbox notice forces a fresh read, switching users re-reads, and sign-out empties every count.

## Key elements

- **`answer` / `reads`** – module-level mutable state: `answer` is the next JSON body the MSW handler returns (from `aSummary()`); `reads` is an array of `{ passive: boolean }` entries recording each request's `Session-Passive` header value.
- **`beforeEach`** – resets Pinia, the QueryClient, and `clearWorkCounts()`, then registers an MSW route for `GET */shop-tasks/summary` that records the passive flag and returns `answer`.
- **`signIn(can, id)`** – helper that populates the session store (viewer stub, access token, tenant abilities) so the composable sees an authenticated user with the given rules.
- **Test: passive read for staff** – signs in with `['display','Order']`, mounts via `mountBadge(useShopWorkFeed)`, asserts exactly one passive read and that `useWorkCount('salesOrders'|'inventory')` reflect the fixture.
- **Test: no read for buyer** – signs in with `['read','Order']` only; asserts zero reads and `undefined` counts.
- **Test: cache reuse + forced refresh** – pushes a new route (no second read), then dispatches a persistent notification with code `shop-tasks.staff.unshipped` / source `inbox`; asserts a second read occurs and the new count is picked up.
- **Test: re-read for new user + sign-out clears** – swaps the viewer stub to a second staff id (second read), then sets `accessToken = undefined` and asserts all counts are `undefined`.

## Relationships

- **`use-shop-work-feed.ts`** – the composable under test; mounted via `mountBadge` in each case.
- **`summary-fixtures.ts`** – supplies `aSummary()` (and optional overrides like `{ salesOrders: 9 }`) for the mock response body.
- **`stub.ts`** – `asStub<SessionViewer>()` creates the minimal viewer object placed into the session store.
- **`badge-host.ts`** – `mountBadge(useShopWorkFeed)` mounts the composable in a Vue test wrapper and returns a `router` handle for route-push assertions.
- **`msw-server.ts`** – provides the `server` instance; the test calls `server.use(...)` in `beforeEach` to register a `GET */shop-tasks/summary` handler that records the passive header and returns the current `answer`.
- **`wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top level to register shop-tasks modules in the test runtime before any test runs.

## Notes

- `wireModulesIntoCore()` is invoked **at module scope** (outside `beforeEach`), so it runs exactly once per file import; forgetting this would make the composable unresolvable.
- The "passive" contract is asserted purely through the `Session-Passive: true` request header—there is no separate API or query flag.
- The forced-refresh trigger is a **persistent** notification (`persistent: true`) with a specific `code` (`shop-tasks.staff.unshipped`) and `source: 'inbox'`; non-matching notices would not invalidate the cache.
- `answer` is reassigned mid-test (not just in `beforeEach`) to simulate a changed server response for the second read in the cache-reuse case.
