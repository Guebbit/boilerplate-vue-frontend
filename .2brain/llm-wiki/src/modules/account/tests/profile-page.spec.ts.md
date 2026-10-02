---
source: src/modules/account/tests/profile-page.spec.ts
sha256: 33f19015ca0c17b0796c92004479e9714fd7e4d3476ee13a243717634f74add5
generated_at: 2026-10-02T14:51:20.819398+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-page.spec.ts

## Purpose

Vitest spec that mounts the real `Profile.vue` page (with all sibling panels stubbed) to verify the record-edit form's own HTTP behaviour: what an ordinary save sends to `PATCH /account`, what it deliberately omits, and how the pending-email notice / resend / cancel flow interacts with the same endpoint. Every assertion is made against the raw request config captured on the mocked `orvalMutator`, never against rendered UI beyond button-state checks.

## Key elements

- **`mountProfile()`** – Mounts `Profile` with the real router, Vuetify, and i18n plugins; stubs `ProfileAvatar`, `ProfilePasswordChange`, `ProfileTwoFactor`, `ProfileSessions`, `ProfileAddresses`, `ProfileExportData`, `ProfileDeleteAccount`, and `LayoutDefault` so only the form `Profile.vue` owns is exercised.
- **`lastAccountPatch()`** – Helper that inspects the mocked `orvalMutator` call log and returns the most recent `PATCH /account` request config (URL, method, raw `data` object before axios serialization).
- **`calledCancelPendingEmail()`** – Helper that checks whether a `DELETE /account/pending-email` call was made.
- **`responses`** (module-level `let`) – Per-test map of `"METHOD /path"` → envelope; the mock resolver reads from it, so each test can override the `GET /account` shape (e.g. adding `pendingEmail`) without affecting other tests.
- **`describe('the GDPR analytics-consent switch')`** – Three tests: flipping the switch sends `analyticsConsent: true`; leaving it untouched omits the key from the PATCH body (asserted via `JSON.stringify` absence); flipping it back to the loaded value marks the form not-dirty (submit button disabled).
- **`describe('the email field, and a pending change')`** – Six tests covering: ordinary save omits `email` entirely; editing the email field sends it; no notice shown when no `pendingEmail`; resend cancels the pending email then re-sends the same address; cancel hits the dedicated `DELETE` endpoint; double-click on resend/cancel produces exactly one HTTP call (race-prevention guard).

## Relationships

- **`src/infrastructure/http/index.ts`** – The module under mock. `vi.mock` replaces `orvalMutator` so no real HTTP occurs; the mock resolves through `parseOrvalFixture` to produce envelope-shaped responses matching the generated API types.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope before any test runs, registering enabled modules into the kernel so `collectModuleRoutes(enabledModules)` can build the real router tree used by child panels to resolve links.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Supplies `orvalEnvelope` (wraps raw payloads into the API's response envelope), `parseOrvalFixture` (validates the mock response against the generated schema), and `contractRequest` (validates a request body against the generated `UpdateAccountBody` schema before assertion).

## Notes

- The "omitted field" assertions use `JSON.stringify(patch?.data)).not.toContain('analyticsConsent')` rather than a `key in data` check, because the store always builds the key with an `undefined` value; only serialization drops it. This is the exact wire-level guarantee being tested.
- The double-click tests fire two `.trigger('click')` calls synchronously (via `Promise.all`) before any promise settles, deliberately reproducing the race that a `disabled` attribute bound only after the first request resolves would fail to catch.
- `responses` is reassigned in `beforeEach`, but individual tests may overwrite a key (e.g. adding `pendingEmail` to `GET /account`) after the default assignment — the mock reads the live object, not a snapshot.
- The file is scoped to `Profile.vue`'s direct form only; each stubbed panel (`ProfileSessions`, `ProfileAddresses`, etc.) is expected to have its own spec file covering its independent fetches.
