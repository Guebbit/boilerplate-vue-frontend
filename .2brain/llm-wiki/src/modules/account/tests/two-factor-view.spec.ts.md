---
source: src/modules/account/tests/two-factor-view.spec.ts
sha256: 26f90344ce893304a695d8a2c4f97688bf8ef21f8f07e4e82db2d9e58a90ef82
generated_at: 2026-10-02T14:52:41.554741+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-view.spec.ts

## Purpose

Integration-level Vitest spec that mounts the real `ProfileTwoFactor.vue` / `TwoFactorEnroll.vue` pair and asserts that sensitive values (TOTP secret, one-time backup codes) render exclusively from component-local refs fed by their respective API responses — never from `useTwoFactorStore()`. It exists to lock in FA14's "never park a secret in a store" invariant against regressions.

## Key elements

- **`mountPanel(status)`** — Helper that creates a fresh Pinia, seeds the `GET /account/2fa` response, and mounts `ProfileTwoFactor` with `attachTo: document.body` (required because Vuetify `v-dialog` teleports its content outside the wrapper) plus the Vuetify and i18n plugins.
- **`submitPromptCode(code)`** — Shared helper that types a code into the code-prompt input, dispatches `input`, clicks submit, and flushes promises.
- **`setupBodies()`** — Extracts request bodies from all recorded `orvalMutator` calls whose URL ends with `/setup` (used for assertion on re-enroll payloads).
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a stub that looks up `responses` by `"METHOD /path"` key, supports `__reject` envelopes, and parses success bodies through `parseOrvalFixture`.
- **`vi.mock('@/ui/dialog.ts')`** — Stubs `useDialogStore().confirm` to always resolve `true`, bypassing the global dialog queue so the test stays focused on secret storage.
- **`ARMED_TOTP`** — Minimal `{ method: 'totp', delivers: false, enrolledAt: … }` shape matching `GET /account/2fa`'s `methods` array.
- **`describe` blocks** — Cover: fresh-secret render from setup response; backup-code reveal + discard on first-factor confirm; backup-code regeneration; replace-button naming; cancelled replace re-reading status.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under test's transport layer. The spec mocks its `orvalMutator` export to intercept every HTTP call and return canned envelopes; no real network is made.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register the app's core module wiring (services, DI) so that mounting the Vue SFCs resolves their dependencies in a unit-test context.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `orvalEnvelope` (wraps a raw payload into the Orval response envelope the app expects) and `parseOrvalFixture` (validates/parses a fixture against the generated schema before the mock resolves it).

## Notes

- All DOM assertions read from `document.body.textContent` / `querySelector`, **not** from the Vue Test Utils wrapper, because Vuetify teleports dialog content out of the component subtree. This mirrors the convention in `webhook-create-view.spec.ts`.
- The `beforeEach` clears `document.body.innerHTML` and reloads the `'en'` locale to avoid cross-test contamination of teleported nodes.
- The `orvalMutator` mock supports a `__reject` key on the response entry to simulate the API's own reject envelope (a plain object, matching `onResponseReject`'s shape); the associated `eslint-disable` comment documents why a non-Error rejection is intentional.
- The spec deliberately does **not** assert against `useTwoFactorStore()`; the companion `two-factor-store.spec.ts` separately pins that the store holds neither a secret nor backup codes.
