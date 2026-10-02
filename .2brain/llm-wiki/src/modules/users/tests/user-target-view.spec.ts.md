---
source: src/modules/users/tests/user-target-view.spec.ts
sha256: 226b2f726a1d046be77239e014a210902b32c7c9d34ed3ec414f30a742ee2b9e
generated_at: 2026-10-02T15:50:34.818560+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-target-view.spec.ts

## Purpose

Vitest spec for the admin user-detail page (`User.vue`). It mounts the real page against a real memory-history router and verifies two behaviours: (1) the "strip 2FA" button is gated on `twoFactorEnabledAt` and disappears after a forced refetch following the DELETE, and (2) the "Manage access" shortcut passes the loaded user to `UserAccessDialog` and issues a PATCH only when the dialog confirms. The dialog's own picker/confirm logic is out of scope here.

## Key elements

- **`queueGetResponses(...users)`** — Configures the mocked `orvalMutator` to return queued `User` fixtures in call order for GET requests (initial load → post-action refetch). Non-GET methods resolve with a bare success envelope.
- **`mountPage()`** — Mounts `UserTarget` with `props: { id: 'u1' }`, the real router/vuetify/i18n plugins, and stubs for `LayoutDefault` and `UserAccessDialog`.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a `vi.fn()` so every HTTP call is interceptable per test.
- **`vi.mock('@/ui/dialog.ts')`** — Stubs `useDialogStore().confirm` to always resolve `true`, avoiding the need to mount `DialogHost.vue`.
- **`wireModulesIntoCore()`** — Populates the kernel's module registry so `collectModuleRoutes(enabledModules)` yields the real route tree.
- **`describe('User (detail page)')`** — Four `it` blocks covering: hidden button without 2FA, shown-then-hidden after strip, confirm→PATCH with contract-validated body, and cancel→no PATCH.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under test's HTTP layer; fully mocked here so the suite controls every request/response.
- **`tests/support/unit/fixtures.ts`** — Source of the `aUser(...)` factory used to build user fixtures for each scenario.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn`, which dispatches `confirm`/`cancel` events on the stubbed `UserAccessDialog` component.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called once at module scope to register routes before the router is created.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest` to shape responses and validate PATCH bodies against the OpenAPI schema.

## Notes

- `UserAccessDialog` is stubbed (`stubs: { UserAccessDialog: true }`) deliberately; its own behaviour lives in `user-access-dialog.spec.ts`. The stub lets the suite trigger `confirm`/`cancel` via `emitOn` without fighting Vuetify's `v-dialog` teleport in jsdom.
- The global dialog confirm is also mocked to always accept — this suite tests the *page*, not the dialog-host plumbing. The same pattern is used in `use-dictionary-cell-editor.spec.ts`.
- `queueGetResponses` clamps the call index to the last fixture (`Math.min(call, users.length - 1)`), so an extra unexpected GET still resolves rather than returning `undefined`.
- The router is created at module scope with `collectModuleRoutes(enabledModules)`, meaning the route tree changes if `enabledModules` changes — the suite is coupled to whatever modules are enabled at test time.
