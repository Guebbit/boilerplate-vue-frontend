---
source: src/modules/account/tests/profile-account-consent.spec.ts
sha256: c24c88bd13cfc9cfba496760d9e65ac904aaf336bd0d90f50f27b4819caa5f92
signature: c1837ab8ed3dec51e73b587101b6a008ca80d70a64e12ce4aee274e18124fe78
generated_at: 2026-11-10T03:38:00.055718+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-account-consent.spec.ts

## Purpose

Verifies that while signed in, analytics-consent decisions are persisted to the account via `PATCH /account` (never to the guest cookie), and that sign-out hands the consent banner back to the cookie. Only the HTTP transport is mocked; the consent, profile, auth, and session stores run for real.

## Key elements

- **`USER`** — shared account fixture (`id`, `username`, `email`, `role`); `analyticsConsent` is appended per test.
- **`responses`** — mutable `Record<"METHOD /url", unknown>` of canned HTTP replies; each test overwrites entries before acting.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by method + URL and returns a parsed orval fixture.
- **`patchBodies()`** — extracts every `data` payload sent via `PATCH` from the mock call history; used to assert the consent write target.
- **`signInHolding(analyticsConsent?)`** — sets up a `GET /account` response, calls `useAccountAuthStore().login(...)`, then `useAccountProfileStore().fetchProfile(true)`; returns a promise that resolves once the profile is loaded.
- **`beforeEach`** — resets Pinia, clears mocks, stubs Umami env vars, deletes the `analyticsConsent` cookie, and seeds default `POST /account/login` + `PATCH /account` responses.
- **`describe('the account answer while signed in')`** — six tests covering: banner hidden when account has an answer, banner shown when neither source has one, deny writes account not cookie, grant writes account for a never-answered account, logout reverts to cookie-based "unknown", and a guest (not signed in) grant writes cookie with zero account PATCHes.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mocked neighbor; `orvalMutator` is spied so all HTTP traffic is intercepted while stores remain real.
- **`src/modules/account/stores/auth.ts`** — `useAccountAuthStore` drives real `login` / `logout` calls; its actions trigger profile fetches and consent-state resets.
- **`src/modules/account/stores/profile.ts`** — `useAccountProfileStore` is instantiated to trigger the real `fetchProfile` flow that populates the consent store from the account record.
- **`tests/support/unit/account-view.ts`** — `accountView` shapes the `GET /account` fixture so it matches the Orval-generated response schema.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` is invoked inside the transport mock to coerce raw response data into the typed shape the stores expect.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top level (import side-effect) to register the stores and services the real stores depend on.

## Notes

- `wireModulesIntoCore()` executes on import, not inside a test; adding a second test file in the same Vitest worker that also calls it will trigger a double-registration error.
- The Umami env vars (`VITE_UMAMI_WEBSITE_ID`, `VITE_UMAMI_SRC`) are stubbed because the consent store's `grant`/`deny` path conditionally loads the Umami script; without them the assertions on `effective` would still pass but the script-load side-effect would be skipped.
- `responses` is a single mutable object reassigned in `beforeEach`; individual tests mutate it mid-flow (e.g., updating `GET /account` after a `reopen`) to simulate a server-side state change without a second HTTP call.
- The "guest answer" test intentionally does **not** call `signInHolding`; it instantiates the profile store only to trigger store registration, then asserts that no `PATCH /account` was sent.
