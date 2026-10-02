---
source: src/modules/account/tests/profile-sessions-last-used.spec.ts
sha256: 45b9933d73c015930a461072e5b9e1cbfad768d97be9bf7cb03008a720281796
generated_at: 2026-10-02T12:29:50.727796+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-sessions-last-used.spec.ts

## Purpose

Regression test ensuring the `ProfileSessions` component renders the `lastUsedAt` timestamp on each session row. It exists because the sessions panel previously omitted this field even though the API provided it, leaving users unable to tell which device was most recently active when deciding which to revoke.

## Key elements

- **`SESSION`** — A single fixture object (type `Session`) with `lastUsedAt` set, used as the sole entry in the mocked store.
- **`vi.mock('@/modules/account/stores/sessions.ts', …)`** — Replaces the Pinia store with a plain object exposing `sessions: [SESSION]`, `fetchSessions`, and `revokeSession` (all no-ops).
- **`vi.mock('pinia', …)`** — Patches `storeToRefs` to an identity function so the plain-object mock doesn't break destructuring inside the component.
- **`vi.mock('@/modules/account/stores/auth.ts', …)`** — Stubs `useAuthStore` to provide a `logoutEverywhere` no-op.
- **`describe('the sessions list')` / `it("renders each session's last-used time")`** — Mounts `ProfileSessions` with Pinia, a memory router, Vuetify, and i18n, then asserts the `.session-last-used` element's text contains "Last used".

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Imported as `wireModulesIntoCore` and invoked at module scope (before any `describe`/`it`) to register shared module aliases so the component under test resolves its imports correctly in the Vitest environment.

## Notes

- The Pinia `storeToRefs` mock is an intentional identity pass-through: the mocked sessions store is a plain object, not a real Pinia store, so `storeToRefs` would otherwise return an empty refs object. The comment in the source calls this out explicitly.
- The test is a read-only render assertion only — it does not exercise revocation, filtering, or reactive updates to `sessions`.
- `loadLocale('en')` must be awaited before mounting; the i18n plugin resolves translations lazily, and the assertion depends on the English "Last used" string being available.
