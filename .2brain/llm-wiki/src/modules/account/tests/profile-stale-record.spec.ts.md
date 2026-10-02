---
source: src/modules/account/tests/profile-stale-record.spec.ts
sha256: b0f8a17d9e72a03c1cdceca01c0373f9a344070fc8c33d4ff3f530b127b1f5de
generated_at: 2026-10-02T12:30:14.222076+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-stale-record.spec.ts

## Purpose

Tests the `Profile.vue` page's reaction to a **412 Precondition Failed** response on `PATCH /account` (the record changed on another device/tab). Verifies that the form displays an in-place warning, offers a "reload latest" action, and that pressing it triggers a fresh `GET /account` and clears the warning. Lives in its own file because the sibling `profile-page.spec.ts` mocks `orvalMutator` to answer every PATCH with success.

## Key elements

- **`submitRefused()`** – Mounts `Profile.vue` with all decorative sibling panels stubbed, toggles the analytics-consent checkbox, and submits the form into the mocked 412 rejection. Returns the settled test wrapper.
- **`mockRefusedPatch()`** – Configures the mocked `orvalMutator` so `PATCH` calls reject with the `PRECONDITION_FAILED` envelope, while `GET` calls resolve with `orvalEnvelope`/`parseOrvalFixture` payloads (abilities or `USER`).
- **`profileReads()`** – Counts invocations of `orvalMutator` matching `GET /account`; used to assert the reload triggered an additional read.
- **`PRECONDITION_FAILED`** – The fixed reject envelope (`status: 412`, code `PRECONDITION_FAILED`) that models the API's error shape.
- **`USER`** – Minimal user record fixture (`id`, `username`, `email`, `role`, `analyticsConsent`) returned for `GET /account`.
- **Two `it` blocks** – (1) asserts the warning alert text, its `warning` CSS class, and the existence of `[data-test=profile-reload-latest]`; (2) clicks that button, asserts `profileReads()` incremented by 1 and the button is gone.

## Relationships

- **`src/infrastructure/http/index.ts`** – Its `orvalMutator` export is the single HTTP entry point this spec mocks (`vi.mock('@/infrastructure/http', …)`). All assertions on request counts and response shapes go through that mock.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level so the app's kernel registry is populated before routing or i18n resolves.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` (wraps a payload in the client's envelope) and `parseOrvalFixture` (validates + returns the envelope) used inside `mockRefusedPatch` to build realistic GET responses.

## Notes

- The `vi.mock('@/infrastructure/http', …)` factory is module-level; the real implementation is never loaded. The `orvalMutator` mock is reset in `beforeEach` via `mockReset()`.
- An `eslint-disable` comment suppresses `@typescript-eslint/prefer-promise-reject-errors` because the API contract requires rejecting with a plain envelope object, not an `Error` instance.
- All sibling profile panels (`ProfileAvatar`, `ProfilePasswordChange`, `ProfileTwoFactor`, `ProfileSessions`, `ProfileAddresses`, `ProfileExportData`, `ProfileDeleteAccount`) are stubbed to `true` or a pass-through `LayoutDefault`, keeping the test scoped to the main form.
- The router uses `createMemoryHistory` and the real `collectModuleRoutes(enabledModules)` tree, so `router.push('/en/profile')` resolves the same path the app would use.
