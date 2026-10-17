---
source: src/modules/account/tests/profile-page.spec.ts
sha256: 1eca84d0ffb2789522423fe10dc314f1d3a93b0ad5a1c8e867c677c89d5a82f2
generated_at: 2026-10-17T00:25:47.528123+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-page.spec.ts

## Purpose
Integration-level test for the record-edit form that `Profile.vue` owns directly. It asserts exactly what a user-initiated save sends over `PATCH /account`—and, equally, what it deliberately leaves out—while every sibling panel (`ProfileAvatar`, `ProfileSessions`, etc.) is stubbed so each fetches nothing. The file exists to pin the "absent means untouched" PATCH semantics and the pending-email change workflow.

## Key elements
- **`mountProfile()`** – Mounts the real `Profile.vue` with the app router, Vuetify, i18n, and Pinia active; stubs all eight sibling profile panels.
- **`lastAccountPatch()`** – Returns the raw config of the most recent `PATCH /account` call from `orvalMutator`'s mock call log, *before* axios serialization. Used to assert field-level inclusion/exclusion.
- **`callsTo(method, url)`** – Filters `orvalMutator` mock calls for a specific endpoint; used for bodyless actions like resend/cancel.
- **`calledCancelPendingEmail()`** – Convenience boolean: was `DELETE /account/pending-email` hit?
- **`responses` (module-level `Record<string, unknown>`)** – Per-endpoint fixture map rebuilt in `beforeEach`; the mock reads from it on each call.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that looks up `responses` by `"METHOD /path"` key and wraps the value via `parseOrvalFixture`.
- **`describe('the GDPR analytics-consent switch')`** – Three tests: sends new value on flip, omits the field when untouched, and marks the form clean after flip-and-unflip.
- **`describe('the email field, and a pending change')`** – Tests that an ordinary save omits `email`, an explicit edit includes it, the pending-email notice renders/hides correctly, resend hits only its own endpoint with a server-driven cooldown, and a 429 cooldown refusal surfaces the error inline.

## Relationships
- **`src/modules/account/views/Profile.vue`** – The component under test; imported and mounted directly.
- **`src/infrastructure/http/index.ts`** – Provides `orvalMutator`, which is entirely mocked so the test can inspect outbound request shapes without a network.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so `collectModuleRoutes(enabledModules)` resolves child routes (sessions, addresses) inside the real router.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `contractRequest` (validates a payload against an orval-generated schema), `orvalEnvelope` (wraps a plain object in the API's success envelope), and `parseOrvalFixture` (unwraps envelopes inside the mock).

## Notes
- **Serialization timing:** The store always builds every field key, setting unchanged ones to `undefined`. Only axios serialization drops them. That is why absence is asserted via `JSON.stringify(patch.data).not.toContain('analyticsConsent')` rather than `'analyticsConsent' in data`.
- **`PATCH /account` echoes the fixture, not the request body.** The test never relies on the response to verify what was sent; it always inspects the mock's call log.
- **The `responses` map is rebuilt in `beforeEach`,** but individual tests may overwrite a single key (e.g. `responses['GET /account'] = orvalEnvelope({...USER, pendingEmail: ...})`) to simulate a parked email change.
- **Fake timers** are used only in the cooldown-countdown test and are restored in `.finally()`.
- **Siblings are stubbed as booleans** (`ProfileAvatar: true`), meaning Vue Test Utils replaces them with a generic `<ProfileAvatar-stub>` element—they render no children and issue no HTTP calls.
