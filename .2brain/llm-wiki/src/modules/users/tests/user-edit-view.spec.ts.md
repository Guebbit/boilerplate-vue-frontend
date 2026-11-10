---
source: src/modules/users/tests/user-edit-view.spec.ts
sha256: 19be4a5c7a269c2fb3ed0d7a307ced108114483bd1de093b88dd06f1dad553a9
signature: 7872d1a8bc9bc6ba318d6d44897ff10a344bdb9970bd1843a3239b1c9e99fd0b
generated_at: 2026-11-10T06:08:45.536561+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-edit-view.spec.ts

## Purpose

Vitest suite that mounts the real `UserEdit.vue` page against a real memory-history router and verifies the PATCH/role-door request sequence the admin triggers when editing a user. It guards the contract shape of every outgoing mutation (via Zod `strictObject` schemas) and the confirm-gate flow that separates profile saves from role changes.

## Key elements

- **`mockTransport()`** — Re-wires `orvalMutator` so GETs (and role-door POSTs) resolve with `loadedUser` and everything else resolves with no body. Reset per test via `beforeEach`.
- **`lastPatchBody()`** — Inspects the `orvalMutator` call log to extract the most recent PATCH payload.
- **`mountPage()`** — Mounts `UserEdit` with props `{ id: 'u1' }`, the real router, Vuetify, i18n, and a `UserAccessDialog` stub.
- **`contractRequest(schema, body)`** — Validates a payload against the API's Zod schema and returns the parsed object; used in assertions to prove the body is a shape the real endpoint accepts (catches stray keys, `minLength`, pattern violations that a plain `toEqual` would miss).
- **`emitOn(component, event, payload)`** — Helper (from `mounted-vm.ts`) that emits a Vuetify component's custom event directly, bypassing the need to click through a real menu.
- **Test cases** cover: profile-only save (no role, no dialog); omitting unset optional fields; clearing phone/website/locale to `null`; role change gated behind `UserAccessDialog` confirm; combined profile + role save (PATCH then role door); dialog cancel (no writes); and (truncated) additional role/deactivation scenarios.

## Relationships

- **`src/modules/users/views/UserEdit.vue`** — The component under test; mounted directly.
- **`src/modules/users/components/UserAccessDialog.vue`** — Stubbed at mount time; the suite asserts on its `target`/`options` props and emits its `confirm` event to drive the role-door path.
- **`src/infrastructure/http/index.ts`** — Imported and replaced with a mock in the test; its `orvalMutator` export is the single transport the suite inspects and asserts against.
- **`tests/support/unit/fixtures.ts`** — Supplies `aUser`, `ALL_USER_ACTIONS`, `NO_USER_ACTIONS`, `userActionsOf`, `aProblem` for building seed records.
- **`tests/support/unit/mounted-vm.ts`** — Supplies `emitOn` and `nextRenderTick` for driving Vuetify components and awaiting re-renders.
- **`tests/support/unit/orval-fixture-schema.ts`** — Supplies `contractRequest` (Zod validation in assertions) and `parseOrvalFixture` (decoding mock responses per method/URL).
- **`tests/support/unit/wire-modules.ts`** — Calls `wireModulesIntoCore()` at module scope so `collectModuleRoutes(enabledModules)` resolves real route definitions for the memory router.

## Notes

- `UserAccessDialog` is **stubbed**, not spied on: its internal picker/confirm logic is tested separately in `user-access-dialog.spec.ts`. This suite only verifies the parent page's props and event handling.
- The "omit unset optional fields" test is a regression guard for a real 422 bug (empty strings on `phone`/`website`/`locale` tripping `minLength`/pattern). The `contractRequest` assertion is deliberately stricter than `toMatchObject` here to catch any stray key.
- Role changes never appear in the PATCH body; they go to a dedicated `assign-role` / `revoke-role` endpoint only after the dialog confirms. The suite asserts this separation explicitly.
- The router is built once at module scope with `createMemoryHistory`; `beforeEach` pushes `/en/users/u1/edit` and waits for `router.isReady()` before each test.
