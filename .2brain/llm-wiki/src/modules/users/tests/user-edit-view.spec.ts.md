---
source: src/modules/users/tests/user-edit-view.spec.ts
sha256: a601f8f305ad6880f67c4fa1ca09af51160213214697ea2bc98d9270cdd3bc3e
generated_at: 2026-10-17T01:48:35.432872+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-edit-view.spec.ts

## Purpose

Vitest spec that mounts the real `UserEdit.vue` admin page against a memory-history router to verify the PATCH body sent on save: that unchanged `role`/`active` are excluded (preventing a spurious backend grant-check re-run), that the `UserAccessDialog` confirm gate fires only on role/active changes, and that a 412 response is handled. `UserAccessDialog` itself is stubbed; its internal behaviour belongs to `user-access-dialog.spec.ts`.

## Key elements

- **`wireModulesIntoCore()`** — called at module top level to register module routes/stores before the router is built.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a `vi.fn()` so every HTTP call is interceptable.
- **`router`** — real `createRouter` + `createMemoryHistory`, routes built via `collectModuleRoutes(enabledModules)`; scoped to the `/:locale` parent.
- **`LOADED_USER` / `USER_WITH_CONTACT`** — fixture records built with the `aUser` factory; the latter adds phone/website/locale for "clearing" tests.
- **`mockTransport()`** — configures `orvalMutator` to answer GET with the loaded user and PATCH with a bare success envelope, parsed through `parseOrvalFixture`.
- **`lastPatchBody()`** — extracts the `data` payload of the last PATCH call from mock call history.
- **`mountPage()`** — mounts `UserEdit` with `props: { id: 'u1' }`, plugins (router, vuetify, i18n), and `stubs: { UserAccessDialog: true }`.
- **`beforeEach`** — fresh Pinia, cleared mocks, `grantableRoles` seeded on the session store, locale loaded, router pushed to `/en/users/u1/edit`.
- **`describe('UserEdit')`** — six cases covering: minimal-diff PATCH, omitted empty contact fields (the 422 regression), null on cleared phone/website/locale, role-change dialog flow, and cancelled-dialog no-op.
- **`describe('UserEdit — a save answered 412')`** — exercises the 412 rejection path (truncated in source).
- **`userReads()`** — counts GET calls to `/users/u1` to assert read次数.

## Relationships

- **`src/modules/users/views/UserEdit.vue`** — the component under test; imported and mounted directly.
- **`src/modules/users/components/UserAccessDialog.vue`** — imported for `findComponent` assertions but stubbed via `stubs: { UserAccessDialog: true }`; only its props/emits are inspected.
- **`src/infrastructure/http/index.ts`** — its `orvalMutator` export is the single mock target for all HTTP interactions.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers module routes and stores so the memory router resolves real paths.
- **`tests/support/unit/mounted-vm.ts`** — `emitOn` and `nextRenderTick` drive Vuetify `VSelect` values and flush renders.
- **`tests/support/unit/fixtures.ts`** — `aUser` factory builds the test records.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — `contractRequest` validates PATCH bodies against the Zod `strictObject` schemas; `orvalEnvelope` / `parseOrvalFixture` shape mock responses.

## Notes

- **Vuetify `VSelect` quirk:** native `setValue()` won't update the component model; the tests use `emitOn(select, 'update:modelValue', …)` + `nextRenderTick` instead.
- **`contractRequest` as assertion:** tests assert the PATCH body *against the real Zod schema* (`schemas.UpdateUserByIdBody`), not just against hand-picked keys. This catches stray keys (strict object) and field-level constraints (minLength, pattern) that a plain `toMatchObject` would miss.
- **`wireModulesIntoCore()` is a module-level side effect** (no `beforeAll`); it runs once at import time.
- **`UserAccessDialog` is stubbed**, so the spec only verifies that the parent opens it with the right `target`/`options` props and listens for `confirm`/`cancel`—it never exercises the dialog's own picker UI.
- The 412 test suite is present but its body is truncated in the source shown here; assume additional assertions beyond the visible portion.
