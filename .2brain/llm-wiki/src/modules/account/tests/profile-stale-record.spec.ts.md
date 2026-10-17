---
source: src/modules/account/tests/profile-stale-record.spec.ts
sha256: 041f30a4948694b23ccbe7565f5c65c24a12cae4e8a593b09290ed51ca80b03f
generated_at: 2026-10-17T00:26:07.142015+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-stale-record.spec.ts

## Purpose
Unit test for the Profile page's 412 (Precondition Failed) save-rejection path: verifies the form displays an in-place warning and that the "reload latest" button triggers a fresh `GET /account` and clears the warning. It lives in its own file because `profile-page.spec.ts`'s shared `orvalMutator` mock answers every PATCH with success.

## Key elements
- **`mockRefusedPatch()`** — Configures `orvalMutator` to reject `PATCH` with a 412 error envelope and resolve `GET` calls (returning `USER` or abilities data wrapped in `orvalEnvelope`).
- **`submitRefused()`** — Mounts `Profile.vue` (all sibling panels stubbed), toggles analytics consent, submits the form, and returns the settled wrapper.
- **`profileReads()`** — Counts `GET /account` calls on the mocked `orvalMutator`.
- **`PRECONDITION_FAILED`** — The rejection envelope: `{ success: false, status: 412, … }`.
- **`USER`** — Fixture record returned by `GET /account`.
- **`describe('Profile — a save answered 412', …)`** — Two assertions: (1) warning alert appears with the `warning` class and a reload button exists; (2) clicking reload increments the read count by 1 and removes the button.

## Relationships
- **`src/infrastructure/http/index.ts`** — The module is `vi.mock`-ed at file scope; `orvalMutator` is the single spy the entire spec drives.
- **`src/modules/account/views/Profile.vue`** — The component under test; mounted with the real router, Vuetify, and i18n, but all decorative child panels stubbed.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module level to register module routes before the router is built.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Provides `orvalEnvelope` and `parseOrvalFixture` to shape GET responses into the API's envelope contract.

## Notes
- The 412 rejection value is the API error envelope object, not an `Error` instance. An `eslint-disable` on the reject call documents that the envelope *is* the client's rejection contract.
- The router is the real app router (`collectModuleRoutes(enabledModules)`) so child panels can resolve internal links; only the visual panels are stubbed.
- `beforeEach` resets the mock, creates a fresh Pinia, and navigates to `/en/profile` so each test starts from a clean route state.
