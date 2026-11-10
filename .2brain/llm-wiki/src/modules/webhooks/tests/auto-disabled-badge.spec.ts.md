---
source: src/modules/webhooks/tests/auto-disabled-badge.spec.ts
sha256: d07fa86404971be59d85c5810477a8660332c2cdae5156035c7d778396e08522
signature: 08f66abe23ff700cc3993f0da2f3ffadd14b7d9a09d8b900ca8593444304ce01
generated_at: 2026-11-10T06:14:00.216420+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/auto-disabled-badge.spec.ts

## Purpose

Vitest spec for the webhooks navigation badge (`composables/use-auto-disabled-badge.ts`). Verifies that the badge displays the total count of auto-disabled subscriptions (fetched passively with `pageSize=1`), renders nothing when the viewer lacks the `read:WebhookSubscription` ability, and clears on sign-out.

## Key elements

- **`wireBadge()`** — Locates the `WebhooksList` entry in `webhooksModule.navigation` and mounts its `badge` accessor via `mountBadge`, mirroring how the app shell consumes it.
- **`signIn(can)`** — Seeds the Pinia session store with a stub viewer (`staff-1`) and a set of tenant ability rules, so tests can control permission state.
- **MSW handler (`beforeEach`)** — Intercepts `GET */webhooks/subscriptions`, records the query params and the `Session-Passive` header into `asked[]`, and returns a canned `{ totalItems: total }` envelope.
- **Three `it` blocks** under `describe('the webhooks badge')`:
  - *Wears the total, asked passively* — asserts badge value equals `total`, exactly one request was made, `Session-Passive: true`, `autoDisabled=true`, `pageSize=1`.
  - *Wears nothing without permission* — grants only `read:Order`; asserts badge is `undefined` and **zero** HTTP requests were made.
  - *Wears nothing after sign-out* — signs in, reads the badge, then clears `accessToken`; asserts badge becomes `undefined`.

## Relationships

- **`src/modules/webhooks/module.ts`** — Imports `webhooksModule` to access the real navigation array and the badge function under test.
- **`tests/support/unit/wire-modules.ts`** — Calls `wireModulesIntoCore()` once at module scope so the registry that `mountBadge` and the session store resolve against is populated.
- **`tests/support/unit/badge-host.ts`** — Provides `mountBadge`, a minimal Vue mount harness that returns a reactive `result` ref for the badge's computed value.
- **`tests/support/unit/msw-server.ts`** — Provides the shared MSW `server` instance imported by this spec; the spec registers a per-test route handler on it inside `beforeEach`.
- **`tests/support/stub.ts`** — Provides `asStub` to cast a plain object to a `SessionViewer` type without a full mock.

## Notes

- `wireModulesIntoCore()` runs at **module top level** (outside `beforeEach`), so the registry is wired once per file load rather than per test.
- The MSW handler is registered inside `beforeEach` via a `.use()` call on the shared `server` instance, layering on top of any base routes and resetting between tests.
- `queryClient.clear()` in `beforeEach` prevents cross-test contamination of TanStack Query caches.
- The test asserts the badge requests `pageSize=1` with `items: []` in the response — the badge only needs `meta.totalItems`, not actual rows.
