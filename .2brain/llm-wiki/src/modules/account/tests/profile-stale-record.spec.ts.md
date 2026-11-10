---
source: src/modules/account/tests/profile-stale-record.spec.ts
sha256: 4c80c14630555bbf392e47cb93409c01457feb4fbe5772d20e404abae2e89ad8
signature: f4559c796167a711416db1a02ad761a66ce55f6f80d7eb7fac3a9a67912cf4a1
generated_at: 2026-11-10T03:40:23.026987+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-stale-record.spec.ts

## Purpose

Tests the Profile page's reaction to a 412 (Precondition Failed) response on `PATCH /account` — the "record changed on another device or tab" conflict. It verifies the form displays an in-place warning with a "reload latest" action, and that pressing that action issues a fresh `GET /account` past any store-level cache and clears the warning. Lives in its own file because `profile-page.spec.ts` mocks every PATCH as a success and cannot express the refusal path.

## Key elements

- **`submitRefused()`** — Mounts the real `Profile` component (all child panels stubbed), flips the analytics-consent input, submits the form, and returns the settled wrapper.
- **`mockRefusedPatch()`** — Reconfigures `orvalMutator` so `PATCH` rejects with the 412 problem envelope and every other request resolves via `parseOrvalFixture`.
- **`profileReads()`** — Counts prior `orvalMutator` calls matching `GET /account`, used to assert the reload actually issues a new read.
- **`PRECONDITION_FAILED`** — The 412 problem envelope built with `aProblem(412, …)`.
- **`USER`** — Minimal fixture record (`id`, `username`, `email`, `role`, `analyticsConsent`) handed to `accountView`.
- **Two `it` cases** — (1) warning text + `warning` class + reload button presence; (2) reload increments read count by one and removes the button.

## Relationships

- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`; the test mocks this module's export so the function's behavior is controlled per-test.
- **`src/modules/account/views/Profile.vue`** — The component under test; imported directly and mounted with real router, Vuetify, and i18n plugins.
- **`tests/support/unit/account-view.ts`** — Provides `accountView()` to shape the fixture response for GET requests.
- **`tests/support/unit/fixtures.ts`** — Provides `aProblem()` to construct the 412 problem envelope.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `parseOrvalFixture()` to convert the raw fixture into the response shape `orvalMutator` is expected to resolve with.
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore()` (called at module scope) to register module-level side effects the component depends on.

## Notes

- The `vi.mock('@/infrastructure/http')` is hoisted; after it, `orvalMutator` is a bare `vi.fn()` with no implementation until a test calls `mockRefusedPatch()` or the default reset in `beforeEach`.
- All decorative sibling panels (`ProfileAvatar`, `ProfilePasswordChange`, etc.) are stubbed to `true` so only the profile form and its error region render.
- The reload assertion specifically checks that the read count increased by exactly 1, confirming the request bypasses any Pinia-store cache rather than reading from it.
- The eslint-disable comment on `Promise.reject` is intentional: the rejection payload is a structured problem envelope, not an `Error` instance, and that is the API's documented client-side rejection contract.
