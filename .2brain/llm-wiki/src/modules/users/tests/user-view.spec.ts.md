---
source: src/modules/users/tests/user-view.spec.ts
sha256: ef53df1253f1637c02bd296806ed813a5dd908094427507cbcc93aa44d98100a
signature: c1166cc1fc166da8cf16e63e75341da789e53306bf8720518d38c9303bfc9405
generated_at: 2026-11-10T06:09:37.542031+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-view.spec.ts

## Purpose

Vitest component spec that mounts the real `UserTarget.vue` detail page against a real memory-history router and two describe blocks: one asserting the "History" link is gated on the `read:AuditLog` CASL ability and the `observability` route existing, and one covering the purchase-hold / needs-review UI (pause, lift, flag) including ability checks, toast messaging, and double-click idempotency.

## Key elements

- **`router`** – Real `vue-router` instance built from `collectModuleRoutes(enabledModules)`; used so named routes like `AuditLog` resolve to actual paths.
- **`A_USER`** – Minimal fixed `UserType` fixture (id `u1`, role `admin`, no actions, no hold).
- **`signIn(canReadAuditLog: boolean)`** – Seeds the session store with a token, viewer, and a CASL ability set that either includes `['read','AuditLog']` on the tenant scope or leaves it empty.
- **`mountUser(user: UserType)`** – Stubs `store.watchUser` to return `noopWatchHandle()`, seeds the user via `store.addUser`, sets `selectedUserId`, then mounts `UserTarget.vue` with the shared router, Vuetify, and i18n.
- **`describe('the "History" link')`** – Three tests: link absent without the ability; link present with `href` `/en/audit?target=u1` when the ability is held; link absent (no throw) when the `observability` module is excluded from the router.
- **`describe('the purchase hold')`** – Tests pause/lift button visibility by ability, hold text (reason, until, note), lift invocation + toast, clean rendering when `note` is absent, double-click guard, and the "needs review" flag (flagged-without-hold shows "Mark as reviewed"; flagged-with-hold shows only "Lift the hold"; unflagged shows neither).

## Relationships

- **`src/modules/users/views/UserTarget.vue`** – The component under test; imported as `User` and mounted in every test.
- **`src/modules/users/store.ts`** – `useUsersStore` is spied on (`watchUser`, `liftPurchaseHold`) and mutated (`addUser`, `selectedUserId`) to seed state without triggering real fetches.
- **`tests/support/unit/fixtures.ts`** – Provides `ALL_USER_ACTIONS`, `NO_USER_ACTIONS`, and `userActionsOf()` to construct ability-bearing user fixtures.
- **`tests/support/unit/watch-handle.ts`** – Exports `noopWatchHandle`, the return value of the stubbed `watchUser`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so the kernel registry knows which modules are active before `collectModuleRoutes` runs.
- **`contracts/rest/index.ts`** – Indirectly referenced through the `UserType` shape and the store's API surface; not imported directly by this spec.

## Notes

- `watchUser` is always stubbed to `noopWatchHandle()`, so no real polling or WebSocket connection is attempted; the user is seeded directly into the store's dictionary.
- The third History-link test constructs a *second* router with `observability` filtered out to prove the component guards on `router.hasRoute` rather than assuming the route exists.
- The "lifts the hold once when the button is pressed twice" test fires both clicks before any `await` to exercise the in-flight guard; it asserts `liftPurchaseHold` was called exactly once.
- `beforeEach` does `router.push('/en/users/u1')` before `router.isReady()` to avoid the initial-navigation warning in memory-history mode.
- The spec does **not** test the store's fetch or mutation logic itself—only the view's rendering, ability gating, and event wiring.
