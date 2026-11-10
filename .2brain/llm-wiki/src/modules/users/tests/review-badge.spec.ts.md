---
source: src/modules/users/tests/review-badge.spec.ts
sha256: 2d1a1cadf117d835e5cfc7b9f8e2e37541b5b261346ca6dc96e40a1639a886ec
signature: 77301ea71c545ecbd2840a2fbc0ca81b31756b8676f6715d075b2ec02a32a317
generated_at: 2026-11-10T06:06:33.472287+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/review-badge.spec.ts

## Purpose

Unit tests for the **UsersList** navigation badge (implemented by `composables/use-review-badge.ts`). Verifies that the badge exposes the total of live accounts flagged for review via a single passive, one-row request against the users list — only when the session holds `read User` — and that the badge disappears once the session ends.

## Key elements

- **`asked`** – Module-scoped array recording each `GET */users` call the MSW handler receives (URL params + whether the `Session-Passive` header was `true`). Reset in `beforeEach`.
- **`total`** – The `meta.totalItems` value the mock endpoint returns; the expected badge number.
- **`wireBadge()`** – Locates the `UsersList` entry in `usersModule.navigation` and mounts its `badge` accessor through `mountBadge`, returning a reactive `result`.
- **`signIn(can)`** – Populates the Pinia session store with a stub viewer, a token, and the given `[ability, resource]` rules.
- **Three `it` blocks** under `describe('the users badge')`:
  1. Badge equals `total`; exactly one request; passive; query contains `purchaseHoldReview=true`, `deleted=false`, `pageSize=1`.
  2. Badge is `undefined` and zero requests when the session lacks `read User`.
  3. Badge becomes `undefined` after the access token is cleared (sign-out).

## Relationships

- **`src/modules/users/module.ts`** – The module under test. The badge function is read from its `navigation` array (entry named `UsersList`).
- **`tests/support/unit/msw-server.ts`** – Provides the `server` instance; the spec registers a `GET */users` handler on it in `beforeEach`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope to make the users module reachable by the badge composable.
- **`tests/support/unit/badge-host.ts`** – `mountBadge(fn)` runs the badge accessor inside a reactive host and returns a `{ result }` ref the assertions read from.
- **`tests/support/stub.ts`** – `asStub<SessionViewer>` casts a plain object into the session viewer shape so `signIn` can populate the store.

## Notes

- The badge's request is intentionally **passive** (`Session-Passive: true`) and asks for only **one row** (`pageSize=1`); the composable cares only about `totalItems`, not the items array. The mock returns an empty `items` list to reflect this.
- The query carries **no shop code** — the badge reads the users list globally, not per-shop.
- `wireModulesIntoCore()` runs at **module import time**, not inside `beforeEach`; the module wiring is assumed to be idempotent.
- Promises are flushed with `@vue/test-utils` `flushPromises`, not `vitest`'s `vi.waitFor` or a `setTimeout` shim.
