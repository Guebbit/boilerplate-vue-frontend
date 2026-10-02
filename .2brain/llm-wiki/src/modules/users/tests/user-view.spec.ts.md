---
source: src/modules/users/tests/user-view.spec.ts
sha256: 08f26731fff9b4f62097b4f19ff8c388773093d450fb8805cc7e38b8246c6e03
generated_at: 2026-10-02T15:51:11.667209+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-view.spec.ts

## Purpose

Verifies a single UI concern on the User detail page: the **"History" link** renders only when the current viewer holds the `audit.any.read` ability (CASL subject `AuditLog`), per FE_PARITY_0924 G2. It mounts the real `User.vue` against a memory-history router and a real Pinia store, with `watchUser` stubbed out so no network fetch occurs.

## Key elements

- **`signIn(canReadAuditLog)`** — Populates the session store with a test viewer; grants or withholds `['read', 'AuditLog']` in the tenant abilities array.
- **`mountUser(user)`** — Seeds the user into `useUsersStore`, stubs `watchUser` to return `noopWatchHandle()`, then mounts `User.vue` with router, Vuetify, and i18n plugins. Returns the `mount` wrapper.
- **`A_USER`** — Fixed fixture (`id: 'u1'`, admin role, active) used across all three cases.
- **`router`** — `createRouter` with `createMemoryHistory`, routes built via `collectModuleRoutes(enabledModules)`. Gives the test a real route table so `{ name: 'AuditLog' }` resolves.
- **`describe('the "History" link')`** — Three assertions:
  - Link absent when ability is withheld.
  - Link present and `href` equals `/en/audit?target=u1` when ability is granted.
  - Link absent (and no throw) when the `observability` module is excluded from the route table (FA86 guard).
- **`wireModulesIntoCore()`** — Called once at module scope to register module metadata needed by `collectModuleRoutes`.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, invoked at import time so the kernel registry is populated before `collectModuleRoutes` builds the route tree.
- **`tests/support/unit/watch-handle.ts`** — Provides `noopWatchHandle`, returned by the `watchUser` mock so the store's watcher subscription is a no-op and no real polling or API call fires.

## Notes

- Template mirrors `orders/tests/order-view.spec.ts`; keep the two in sync if the mount pattern changes.
- The third case (FA86) builds a **second, separate router** with `observability` filtered out of `enabledModules`. This exercises the `router.hasRoute('AuditLog')` guard in `User.vue` and confirms the page doesn't throw on a minimal build.
- Selector for the History link is `data-test=user-history`; if the attribute changes in `User.vue`, all three assertions break.
- `beforeEach` navigates to `/en/users/u1` and awaits `router.isReady()` before each test, so route resolution is deterministic.
