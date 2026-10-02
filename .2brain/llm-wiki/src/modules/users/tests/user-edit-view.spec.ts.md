---
source: src/modules/users/tests/user-edit-view.spec.ts
sha256: 6a229af230f8063719cfb63bd85113219d2cc362c6e34f4d52cc0bdd00927506
generated_at: 2026-10-02T15:49:59.065581+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-edit-view.spec.ts

## Purpose

Mounts the real `UserEdit` view against a memory-history router and a mocked `orvalMutator` transport to verify two contract-level behaviours: (1) a PATCH body contains **only** the fields that actually changed (no unchanged `role`/`active` riding along to re-trigger the backend's grant check), and (2) role or active changes are gated behind the `UserAccessDialog` confirmation before any request is sent. The spec also validates PATCH bodies against the real `UpdateUserByIdBody` strictObject schema to catch stray keys or invalid empty-string defaults (regression FA123).

## Key elements

- **`mountPage()`** – Mounts `UserEdit` with `{ id: 'u1' }`, the app router, Vuetify, i18n, and stubs for `LayoutDefault` and `UserAccessDialog`.
- **`mockTransport()`** – Configures the `orvalMutator` mock: GET → `loadedUser` envelope, PATCH → bare success envelope.
- **`lastPatchBody()`** – Pulls the `data` payload from the most recent PATCH call on the mock.
- **`userReads()`** – Counts GET calls to `/users/u1` (used by the 412 re-fetch scenario).
- **`submitRefused()` / `mockRefusedPatch()`** – Helpers for the 412 group; make every PATCH reject with a `PRECONDITION_FAILED` envelope.
- **`LOADED_USER` / `USER_WITH_CONTACT`** – Fixture records built via `aUser()`; the second has phone/website/locale set so the "clear to null" cases have something to clear.
- **`PRECONDITION_FAILED`** – The structured 412 rejection object matching the API's error-envelope contract.
- **`describe('UserEdit')`** – Six tests covering: clean-field save, omission of unset optional fields, clearing phone/website/locale to `null`, role change via dialog confirm, and dialog cancel sending nothing.
- **`describe('UserEdit — a save answered 412')`** – Verifies the UI warns on a 412 and re-fetches the record.

## Relationships

- **`src/infrastructure/http/index.ts`** – `orvalMutator` is the single network seam; the spec mocks this module (`vi.mock('@/infrastructure/http')`) so no real HTTP occurs.
- **`tests/support/unit/fixtures.ts`** – Supplies the `aUser()` factory used to build `LOADED_USER` and `USER_WITH_CONTACT`.
- **`tests/support/unit/mounted-vm.ts`** – Provides `emitOn()` (to drive Vuetify `VSelect` and the dialog's `confirm`/`cancel` events) and `nextRenderTick()` for Vue reactivity settling.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level so `collectModuleRoutes(enabledModules)` resolves real routes for the memory router.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `contractRequest` (validates a body against an Orval/Zod schema, rejecting stray keys), `orvalEnvelope` (wraps data in the API's success envelope), and `parseOrvalFixture` (dispatches by method+URL).

## Notes

- `UserAccessDialog` is **stubbed** (`stubs: { UserAccessDialog: true }`); its internal picker/confirm logic is covered by `user-access-dialog.spec.ts`. This spec only asserts that the dialog *opens* with the right props and that the form reacts to `confirm`/`cancel` events.
- Vuetify `VSelect` components are driven via `emitOn(select, 'update:modelValue', …)` rather than `wrapper.setValue()`, because the component does not respond to native `<input>` events.
- The FA123 regression this file guards: the form's initial values default empty optional fields to `''`, which would pass a loose `toMatchObject` assertion but fail the real endpoint's `minLength`/pattern rules (HTTP 422). `contractRequest` against the strictObject schema is the assertion that catches this.
- `wireModulesIntoCore()` is a module-level side effect (runs once per test file), not a per-test setup.
- The router is built with `createMemoryHistory` scoped to `collectModuleRoutes(enabledModules)`, so only enabled modules' routes exist; tests push to `/en/users/u1/edit`.
