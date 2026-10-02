---
source: src/modules/account/tests/password-change-sessions-refresh.spec.ts
sha256: c845216260102c7923a4fb3ce5897e114786d5c236fadf7d910d55d4f4e16391
generated_at: 2026-10-02T12:26:25.182283+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-change-sessions-refresh.spec.ts

## Purpose

Verifies that a successful password change triggers a refetch of the device-sessions list. The server-side `postPasswordChange` endpoint revokes all other sessions, so the UI must re-query after the change; without this refetch the sessions panel would display stale entries until the next page visit.

## Key elements

- **`changePassword` / `fetchSessions`** – `vi.fn()` mocks injected via `vi.mock` of the profile and sessions Pinia stores respectively.
- **`mountForm()`** – Mounts `ProfilePasswordChange.vue` with Pinia, Vuetify, and i18n plugins.
- **`submitValidChange()`** – Simulates a full user flow: toggles the form open, fills current/new/confirm password fields via `data-test` selectors, triggers `submit.prevent`, and awaits a tick.
- **`flushAll()`** – Yields one macrotask tick (`setTimeout 0`) to let the debounced breach check and the async submit chain settle.
- **`describe('a successful password change')`** – Single test asserting that `changePassword` receives the expected args and `fetchSessions` is called exactly once.

## Relationships

The listed neighbor `tests/unit/scripts/e2e/cypress-spec-globs.spec.ts` is not imported or referenced by this file; the graph connection is likely structural (shared test-directory conventions) rather than a runtime dependency. No direct interaction exists in the source.

## Notes

- Both stores are mocked as plain objects returning a single function, not as real Pinia stores. This keeps the test focused on the component's side-effect (calling `fetchSessions`) rather than store internals.
- `loadLocale('en')` is called inside the test body rather than a `beforeEach`; add new tests in the same `describe` block and replicate that call.
- Selectors rely on `data-test` attributes defined in `ProfilePasswordChange.vue`; renaming those attributes will break this spec.
- `flushAll` is intentionally minimal (one tick). If the submit chain gains additional microtask or timer steps, this helper may need to be extended.
