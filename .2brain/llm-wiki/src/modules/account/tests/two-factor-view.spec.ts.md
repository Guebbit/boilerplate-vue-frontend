---
source: src/modules/account/tests/two-factor-view.spec.ts
sha256: 7eacf843da944ebaa1f0d69e49619f0e05800822961dfa407b68e7df2f5a3593
signature: 1a059e266131fd1110d132daffaff0e33f1d68f21f420a3d70012fb245fd0ea4
generated_at: 2026-11-10T03:43:32.561781+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-view.spec.ts

## Purpose

Integration spec that mounts the real `ProfileTwoFactor.vue` panel (and its `TwoFactorEnroll.vue` child) to verify a specific security invariant: TOTP secrets and one-time backup codes must render from component-local refs fed directly by the setup/confirm API response, and **never** from `useAccountTwoFactorStore()`. It complements `two-factor-store.spec.ts`, which pins the store as holding neither field.

## Key elements

- **`responses`** — module-level `Record<string, unknown>` keyed by `METHOD /url`; each test sets the canned API body before triggering an action.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses`, supports a `__reject` sentinel for simulating API error envelopes, and validates success bodies via `parseOrvalFixture`.
- **`vi.mock('@/ui/dialog.ts')`** — stubs `useDialogStore().confirm` to always resolve `true`, bypassing the global `DialogHost` queue (same pattern as `user-target-view.spec.ts`).
- **`mountPanel(status)`** — helper that activates a fresh Pinia, sets the `GET /account/2fa` response, and mounts `ProfileTwoFactor` attached to `document.body` with Vuetify + i18n plugins.
- **`submitPromptCode(code)`** — types a value into the shared code-prompt input and clicks submit; used by multiple tests.
- **`setupBodies()`** — extracts the `data` payload from every `orvalMutator` call whose URL ends in `/setup`, in call order.
- **`ARMED_TOTP`** — constant shape representing an enrolled TOTP method for `GET /account/2fa` fixtures.
- **`describe` blocks** — cover: secret rendering from setup response; backup-code reveal on first-factor confirm then discard on Done; backup-code regeneration; replace-button labeling; and cancel-replace re-read of status.

## Relationships

- **`src/modules/account/components/ProfileTwoFactor.vue`** — the component under test; mounted directly and exercised end-to-end.
- **`src/infrastructure/http/index.ts`** — its `orvalMutator` export is the single HTTP seam being mocked; the mock's canned-response map stands in for the real transport.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register global side-effects (i18n locale, etc.) that the component's setup expects.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` validates that each canned response conforms to the expected Orval-generated schema for the given method/URL.
- **`tests/support/unit/fixtures.ts`** — provides `aProblem` (an RFC 7807 problem-detail fixture) for error-path assertions.

## Notes

- All DOM assertions read from `document.body`, not from the Vue wrapper, because Vuetify's `v-dialog` teleports its slot content outside the component's root. The wrapper is still used for a few non-teleported checks (e.g., the replace button's label).
- The `__reject` key in the `responses` map is a convention: a value of `{ __reject: <plain object> }` causes the mock to `Promise.reject` with that object, mirroring how `onResponseReject` surfaces the API's own reject envelope.
- The file is truncated in the dependency snapshot; the visible content ends mid-`describe` ("changing factors nee…"), indicating additional test cases exist beyond what is shown here.
- The dialog-confirm stub intentionally removes the `DialogHost` from the picture; this suite is about secret storage locality, not dialog queue plumbing.
