---
source: src/modules/account/tests/profile-sessions-last-used.spec.ts
sha256: 36ec095df692bd85683f1a62a3f97bd0432a99809dae908e8d437aa8212a06ea
generated_at: 2026-10-17T00:25:56.881139+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-sessions-last-used.spec.ts

## Purpose

Render-focused unit tests for `ProfileSessions.vue` that verify the sessions panel correctly displays each session's last-used timestamp, sign-in start time, and (for `cookie`-mode sessions) the coarse device label. The file exists to guard the "pick the device to revoke" UX described in the component's header comment.

## Key elements

- **`SESSION`** — fixture for a non-current session (no `device` field).
- **`SESSION_WITH_DEVICE`** — fixture for a `cookie`-mode session carrying `device: 'Firefox on Linux'`.
- **`vi.mock('../stores/sessions.ts')`** — replaces the Pinia store with a plain object exposing the two fixtures plus no-op `fetchSessions`/`revokeSession`.
- **`vi.mock('pinia')`** — patches `storeToRefs` to an identity pass-through (see Notes).
- **`vi.mock('../stores/auth.ts')`** — stubs `logoutEverywhere` as a no-op.
- **`router`** — memory-history router with an empty route table; only needed so `ProfileSessions` can mount without a real navigation target.
- **`describe('the sessions list')`** — three assertions:
  - `.session-last-used` text contains "Last used".
  - `[data-test="session-started"]` text contains "Signed in".
  - `[data-test="session-device"]` renders exactly one entry ("Firefox on Linux") for the device-carrying session.

## Relationships

- **`src/modules/account/components/ProfileSessions.vue`** — the component under test; mounted via `@vue/test-utils` with Pinia, a memory router, Vuetify, and the app i18n instance.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope to register test-support module shims before any test runs.

## Notes

- The `pinia` mock exists because the sessions store is replaced with a plain object; `storeToRefs` expects a real Pinia store and would throw otherwise. The identity shim is sufficient because the component only reads (never writes) through refs.
- Each test calls `await loadLocale('en')` before mounting — the i18n plugin is not pre-loaded globally in this harness.
- The tests are strictly read-only render assertions; no interactions (clicks, revokes) are exercised here.
