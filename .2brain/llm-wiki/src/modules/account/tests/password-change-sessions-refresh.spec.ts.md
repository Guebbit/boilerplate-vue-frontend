---
source: src/modules/account/tests/password-change-sessions-refresh.spec.ts
sha256: 6d1b00cc13e8905391abe1de5c4db56623976f76020b284179eb28f1abd79789
generated_at: 2026-10-17T00:23:37.883086+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-change-sessions-refresh.spec.ts

## Purpose

Verifies that the `ProfilePasswordChange` form triggers a device-sessions refetch after a successful password change. Because the backend (`postPasswordChange`) revokes all other sessions server-side, the UI must proactively refetch rather than showing stale session data until the user's next navigation.

## Key elements

- **`changePassword`** — `vi.fn` stub for `useProfileStore().changePassword`; resolves to simulate a successful backend call.
- **`fetchSessions`** — `vi.fn` stub for `useAccountSessionsStore().fetchSessions`; the assertion target.
- **`NEW_PASSWORD`** (`'Passw0rd!'`) — a password that passes the form's validation rules.
- **`mountForm()`** — mounts `ProfilePasswordChange` with a real Pinia instance, the app's Vuetify, and i18n.
- **`submitValidChange()`** — end-to-end form interaction: opens the panel via `data-test="toggle-change-password"`, fills all three inputs, and submits the form.
- **`flushAll()`** — single `setTimeout(…, 0)` tick to let the debounced breach-check and the submit promise chain settle.
- **`describe('a successful password change')`** — one test asserting that `changePassword` receives the three expected arguments and `fetchSessions` is called exactly once.

## Relationships

- **`src/modules/account/components/ProfilePasswordChange.vue`** — the SUT; imported and mounted directly. The test interacts with its DOM (`data-test` attributes) and its store calls (mocked).
- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** — listed as a graph neighbor (likely a glob-pattern or CI inclusion match); no runtime import or call exists in this file.

## Notes

- Both Pinia stores (`../stores/profile.ts`, `../stores/sessions.ts`) are replaced with `vi.mock` at module level; the real stores never execute.
- `loadLocale('en')` must be awaited before the first test or i18n translations will be missing during mount.
- `flushAll` is deliberately a single 0 ms tick, not `vi.useFakeTimers` + `advanceTimersByTime`; the only async work expected is the debounced password-breach check and the submit promise chain.
- The test exercises the *happy path* only; no failure, validation-error, or concurrent-submission cases are covered here.
