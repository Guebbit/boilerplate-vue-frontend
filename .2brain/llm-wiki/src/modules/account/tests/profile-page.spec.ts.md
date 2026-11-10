---
source: src/modules/account/tests/profile-page.spec.ts
sha256: 8903637515d376934eaa0877a821e056ef728e493806f70a472f12971c62c42c
signature: 8fc646905091ace529f3887304d06b1349a57862b0266e181fd46f41a7520d6a
generated_at: 2026-11-10T03:39:52.611384+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-page.spec.ts

## Purpose

Vitest spec that mounts the real `Profile.vue` page (with every sibling panel stubbed) to assert the behaviour of the form the page owns directly: what an ordinary save sends over `PATCH /account`, which fields it deliberately omits, and the full lifecycle of the pending-email-change workflow (request, error, notice, resend countdown).

## Key elements

- **`mountProfile()`** – Mounts `Profile.vue` with router, Vuetify, i18n, Pinia; stubs `ProfileAvatar`, `ProfilePasswordChange`, `ProfileTwoFactor`, `ProfileConnectedAccounts`, `ProfileSessions`, `ProfileAddresses`, `ProfileExportData`, `ProfileDeleteAccount`.
- **`lastAccountPatch()`** – Returns the most recent `PATCH /account` config object from the `orvalMutator` mock's call log.
- **`callsTo(method, url)`** – Filters `orvalMutator` calls to a specific HTTP verb + path; used to assert the email-change endpoints in isolation.
- **`calledCancelPendingEmail()`** – Convenience check that `DELETE /account/email-change` was hit.
- **`guard` (hoisted mock)** – Captures the `isDirty` ref passed to `useLeaveGuard` so tests can assert dirty-state without the real composable.
- **`router`** – Memory-history router seeded with `collectModuleRoutes(enabledModules)` so child panels' internal links resolve.
- **`USER` / `responses`** – Representative `GET /account` record and a per-endpoint response map rebuilt in `beforeEach`.
- **`vi.mock('@/infrastructure/http')`** – Replaces `orvalMutator` with a function that resolves via `parseOrvalFixture` against the `responses` map, letting tests assert on the *request* config separately.
- **`vi.mock('@/ui/composables/use-leave-guard.ts')`** – Stubs the composable so the page renders without a real navigation guard.
- **`beforeEach`** – Fresh Pinia, cleared mocks, default `responses`, `loadLocale('en')`, `router.push('/en/profile')`, `router.isReady()`.
- **`describe('the GDPR analytics-consent switch')`** – Verifies: flipping sends only `analyticsConsent: true`; an unrelated save omits the key entirely (`JSON.stringify` check); flipping back to the loaded value leaves the form not-dirty.
- **`describe('the email field, and a pending change')`** – Verifies: `email` is never in the PATCH body; a new-email request goes to `POST /account/email-change` (not PATCH); a 409 surfaces inline via `aProblem`; no notice when `pendingEmail` is absent; the parked address is displayed and resend hits `POST /account/email-change/resend` exactly once; the resend button locks and counts down `resendAfter` seconds using fake timers.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/account/views/Profile.vue` | The component under test; mounted directly and queried via data-test attributes. |
| `src/infrastructure/http/index.ts` | `orvalMutator` is fully mocked so tests can inspect raw request configs and control responses per endpoint. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is called at module scope to register account-module routes into the kernel registry before the router is built. |
| `tests/support/unit/account-view.ts` | `accountView(USER)` shapes the `GET /account` fixture to match the real API response envelope. |
| `tests/support/unit/orval-fixture-schema.ts` | `parseOrvalFixture` parses canned responses; `contractRequest` validates a request body against an OpenAPI schema before assertion. |
| `tests/support/unit/fixtures.ts` | `aProblem(409, [...])` builds a realistic RFC-9457 problem response for the "email already used" error-path test. |

## Notes

- The test asserts **absence** of fields via `JSON.stringify(patch?.data).not.toContain(...)` rather than `in`/`=== undefined`, because the store always builds the key with an `undefined` value and only axios serialization drops it. Use the same technique when adding new "must not be sent" assertions.
- `orvalMutator` mock resolves `PATCH /account` with the `responses` entry (a *response* shape), not the request body. Request-body assertions always go through `lastAccountPatch()` / `callsTo()`.
- The leave-guard composable is mocked with `vi.hoisted` so the `guard` object is available in the module factory. Any new test that needs dirty-state checks should read `guard.isDirty` rather than re-mocking.
- Sibling panels are stubbed with `true` (render nothing). Each has its own spec file; do not add panel-specific assertions here.
- The resend-countdown test uses `vi.useFakeTimers()` and `advanceTimersByTimeAsync`; make sure to restore real timers (handled implicitly by the next `beforeEach`'s `vi.clearAllMocks()` + the global test-runner teardown).
