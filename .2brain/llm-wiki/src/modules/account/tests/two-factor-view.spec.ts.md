---
source: src/modules/account/tests/two-factor-view.spec.ts
sha256: ef6e24114404a57941274b547367b475959086b2b5d98a382f37804109b9fc7b
generated_at: 2026-10-17T00:28:01.027139+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/two-factor-view.spec.ts

## Purpose

Regression spec that pins the "never park a secret in a store" invariant: the TOTP secret and one-time backup codes must render from component-local state fed directly by the `setup`/`confirm` API response, **not** from `useTwoFactorStore()`. It exercises the real `ProfileTwoFactor.vue` + `TwoFactorEnroll.vue` pair through user-visible interactions (enroll, confirm, regenerate, replace, cancel) and asserts the rendered values on `document.body`.

## Key elements

- **`responses`** (module-level `Record<string, unknown>`) — mutable map of canned HTTP responses keyed by `METHOD /url`; each test overwrites entries before triggering the relevant UI action.
- **`mountPanel(status)`** — creates a fresh Pinia, sets the `GET /account/2fa` canned response, and mounts `ProfileTwoFactor` with `attachTo: document.body`, Vuetify, and i18n plugins.
- **`submitPromptCode(code)`** — helper that fills the shared code-prompt input and clicks submit, returning a promise that resolves after two `flushPromises`.
- **`setupBodies()`** — extracts and filters the `orvalMutator` call log to return only the request bodies of `/setup` calls (oldest first).
- **`ARMED_TOTP`** — constant shape (`{ method: 'totp', delivers: false, enrolledAt: … }`) used in `GET /account/2fa` fixtures to represent an enrolled method.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that looks up `responses` and either resolves (via `parseOrvalFixture`) or rejects (when the entry carries a `__reject` key).
- **`vi.mock('@/ui/dialog.ts')`** — stubs `useDialogStore().confirm` to always resolve `true`, bypassing the real dialog queue.
- **Three `describe` blocks:**
  - *the TOTP secret* — verifies the secret renders from the setup response and that backup codes appear after confirm, then are discarded on "Done".
  - *regenerating backup codes* — verifies fresh codes come from the `POST /backup-codes` response, not the store.
  - *replacing an armed method* — checks button label reads "Replace TOTP" (not bare "Add") and that a cancelled replace re-fetches status so the disarmed method disappears.

## Relationships

- **`src/infrastructure/http/index.ts`** — the real module is mocked; `orvalMutator` is the sole HTTP entry point the component uses. The mock routes every call through the `responses` map and `parseOrvalFixture`.
- **`src/modules/account/components/ProfileTwoFactor.vue`** — the component under test, mounted by `mountPanel`; all DOM assertions target elements it (and its child `TwoFactorEnroll.vue`) render.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope before any test runs, establishing the module graph the component expects.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope()` (wraps a payload in the API's standard envelope) and `parseOrvalFixture()` (validates/shapes the canned body per method + URL). Both are used to build every fixture in this file.

## Notes

- All DOM assertions read from `document.body`, not the test wrapper, because Vuetify's `v-dialog` **teleports** its slot content out of the mounted tree. `attachTo: document.body` is required for this to work.
- Tests use a chained `.then(flushPromises)` style rather than `async/await`; each microtask boundary corresponds to one round-trip of component reactivity.
- `responses` is module-level mutable state; `beforeEach` clears `document.body.innerHTML` and reloads the locale, but the map itself is re-populated by each call to `mountPanel`.
- The `__reject` sentinel in a response entry triggers `Promise.reject` to simulate the API returning a reject envelope (matching `onResponseReject`'s plain-object shape).
- The dialog-confirm stub means this suite does **not** verify the real `DialogHost` queue; it is deliberately out of scope (see `user-target-view.spec.ts` for the analogous pattern).
