---
source: src/modules/users/tests/user-view.spec.ts
sha256: edd87f70242d093c4fd4c911ac841156bfc36ba33fba6c7c18d56f00085e376d
generated_at: 2026-10-17T01:48:59.804445+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-view.spec.ts

## Purpose

Vitest spec that mounts the real `User.vue` detail page against a real memory-history router to verify one behavior: the "History" link (gated on the CASL ability `read:AuditLog`) appears, links correctly, or is absent depending on the viewer's abilities and whether the `observability` module is present in the build. The store's `watchUser` fetch is always stubbed so no network call occurs.

## Key elements

- **`router`** – `createMemoryHistory` router whose children come from `collectModuleRoutes(enabledModules)`, so named routes like `AuditLog` resolve to real paths.
- **`A_USER`** – fixed fixture conforming to the `User` type; only `id` is meaningful to the tests.
- **`signIn(canReadAuditLog: boolean)`** – configures the session store's viewer and CASL abilities, granting or withholding `['read', 'AuditLog']`.
- **`mountUser(user)`** – stubs `store.watchUser` to return `noopWatchHandle`, seeds the user into the store dictionary, then mounts `User.vue` with the router, vuetify, and i18n plugins.
- **`beforeEach`** – resets Pinia, loads the `en` locale, pushes `/en/users/u1`, and awaits `router.isReady()`.
- **`describe('the "History" link')`** – three cases: link absent without ability; link present with `href="/en/audit?target=u1"` when ability is held; link absent when the `observability` module is filtered out of the router (exercises the `router.hasRoute` guard).

## Relationships

- **`src/modules/users/views/User.vue`** – the component under test; imported and mounted in every case.
- **`src/modules/users/store.ts`** – provides `useUsersStore`; its `watchUser` method is spied on and mocked, and `addUser` / `selectedUserId` are used to seed state.
- **`tests/support/unit/watch-handle.ts`** – supplies `noopWatchHandle`, the return value of the `watchUser` mock, preventing the real watch/fetch from executing.
- **`tests/support/unit/wire-modules.ts`** – supplies `wireModulesIntoCore`, called once at module scope to register module definitions before `collectModuleRoutes` can resolve them.

## Notes

- The third test constructs a **second** router (`noAdminRouter`) with the `observability` module filtered out; it is not the shared `router`. This is intentional to simulate a build where the module is absent and confirm the link is hidden without throwing.
- `wireModulesIntoCore()` is a module-level side effect (no `await`, no `beforeAll`); it must complete before the top-level `router` constant is evaluated.
- The doc comment states this file mirrors the structure of `orders/tests/order-view.spec.ts` as the canonical template for per-module view specs.
- `contracts/rest/index.ts` appears in the dependency graph but is not directly imported or exercised in this file.
