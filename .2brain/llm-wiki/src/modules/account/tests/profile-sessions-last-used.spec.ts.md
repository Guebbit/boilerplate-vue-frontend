---
source: src/modules/account/tests/profile-sessions-last-used.spec.ts
sha256: aca7d7ff5a38d8bcaae6298c400b3b2844c0cd9a102ca77264ecf05ee555c7c5
signature: 4cca345b7a683ab386ed38a455f273d393ca937cb913ecabe881fc92fa70391b
generated_at: 2026-11-10T03:40:00.806271+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-sessions-last-used.spec.ts

## Purpose

Vitest unit test for `ProfileSessions.vue` that verifies the sessions panel renders each session's "last used" timestamp, sign-in start time, and (for `cookie`-mode sessions) the device label. It asserts these data-test-attribute hooks appear with correct localized text.

## Key elements

- **`SESSION` / `SESSION_WITH_DEVICE`** — fixture objects of type `Session`; the second adds a `device` string (`"Firefox on Linux"`) to exercise the cookie-mode branch.
- **`vi.mock('../stores/sessions.ts')`** — replaces the real Pinia store with a plain object exposing `sessions`, `fetchSessions`, `revokeSession`.
- **`vi.mock('pinia')`** — overrides `storeToRefs` with an identity passthrough so the plain-object mock works in a read-only render test.
- **`vi.mock('../stores/auth.ts')`** — stubs `useAccountAuthStore` with a `logoutEverywhere` vi.fn.
- **`router`** — `createRouter` with `createMemoryHistory` and zero routes; only an instance is needed for the component to mount.
- **`describe('the sessions list')`** — three assertions:
  - `renders each session's last-used time` — checks `[data-test=session-last-used]` contains "Last used".
  - `renders when each sign-in began` — checks `[data-test="session-started"]` contains "Signed in".
  - `shows the device label when the session carries one…` — asserts `[data-test="session-device"]` appears exactly once with the fixture text.

## Relationships

- **`src/modules/account/components/ProfileSessions.vue`** — the SUT; mounted via `@vue/test-utils` and queried through its `data-test` attributes.
- **`tests/support/unit/wire-modules.ts`** — imported as `wireModulesIntoCore()`; called once at module scope to register any core module mocks the component depends on before tests run.

## Notes

- `storeToRefs` is deliberately replaced with an identity function because the sessions mock is a plain object, not a real Pinia store. The comment in the file explains this; any future test that needs reactive unwrapping from the store must use a real Pinia store instead.
- The mock path for the sessions store is relative (`../stores/sessions.ts`), so it must stay in sync with the component's import path if the directory structure changes.
- `loadLocale('en')` is called in every test to ensure i18n strings are available before the assertion runs.
