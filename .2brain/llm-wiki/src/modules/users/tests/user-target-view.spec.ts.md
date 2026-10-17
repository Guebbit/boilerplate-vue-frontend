---
source: src/modules/users/tests/user-target-view.spec.ts
sha256: 816df7985de705f6f259aa8d7682c88fe140dff1f7cabf6d9f5b4312acbf4d5f
generated_at: 2026-10-17T01:48:47.452453+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-target-view.spec.ts

## Purpose

Integration-style unit test for the admin user-detail page (`User.vue`). It mounts the real page component against a real memory-history router (scoped to enabled modules) and verifies that every visible control is gated by the row's `actions` payload from the server, that no second-factor control exists, and that the "Manage access" shortcut correctly opens a stubbed `UserAccessDialog` and issues a `PATCH` only on confirm.

## Key elements

- **`queueGetResponses(...users)`** — Sets up `orvalMutator` to return a queued sequence of `User` fixtures for successive GET calls; any other method resolves with a bare success envelope.
- **`mountPage()`** — Mounts `UserTarget` (`User.vue`) with `props: { id: 'u1' }`, the real router, Vuetify, i18n, and a **stub** for `UserAccessDialog` (avoids `v-dialog` teleport/lazy-render issues in jsdom).
- **`signInHolding(tenant)`** — Populates the Pinia session store with a test token, viewer, and the exact tenant abilities under test.
- **`ALL`** — Shorthand for `{ update: true, ban: true, delete: true }`, the full-permission actions shape.
- **`describe('User (detail page)')`** — Six `it` blocks covering: no actions → no buttons; full actions → both buttons; update-only (support agent) → edit offered; two-factor always hidden; confirm → correct `PATCH /users/u1` with only changed fields; cancel → no `PATCH` issued.

## Relationships

- **`src/modules/users/views/User.vue`** — The SUT; this file imports it as `UserTarget` and asserts on its rendered controls and emitted data.
- **`src/modules/users/components/UserAccessDialog.vue`** — Stubbed (`stubs: { UserAccessDialog: true }`) so the suite can drive its `confirm`/`cancel` events directly without exercising the dialog's own picker logic.
- **`src/infrastructure/http/index.ts`** — `orvalMutator` is mocked here (`vi.mock('@/infrastructure/http')`) to intercept all HTTP calls made by the page.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so the kernel registry knows which modules to collect routes for.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn`, a helper to trigger component events on a stubbed child.
- **`tests/support/unit/fixtures.ts`** — Provides `aUser(...)`, the factory used to build every `User` fixture in the suite.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest` used to shape mock responses and assert request payloads against the OpenAPI schema.

## Notes

- The router is created **once** at module level with `createMemoryHistory`; `beforeEach` pushes `/en/users/u1` and awaits `router.isReady()`. The route uses `props: true` semantics (the `id` prop is passed explicitly in `mountPage`).
- `UserAccessDialog` is stubbed, not mocked with a manual render — this means assertions on the dialog go through `wrapper.getComponent(UserAccessDialog)` and its `.props('target')`, not its rendered DOM.
- The confirm-flow test asserts the `PATCH` body via `contractRequest(schemas.UpdateUserByIdBody, …)` (from `@api/schemas`), tying the payload shape to the generated OpenAPI contract rather than a hand-written object.
- `queueGetResponses` caps the index at the last queued user (`Math.min(call, users.length - 1)`), so a force-refetch after a mutation reuses the last fixture rather than returning `undefined`.
