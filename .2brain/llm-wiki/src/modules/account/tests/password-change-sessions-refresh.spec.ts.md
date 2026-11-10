---
source: src/modules/account/tests/password-change-sessions-refresh.spec.ts
sha256: 2346740873a7aca1ef2f6ab3ecd20340211e0ba9f1d23eae946f58520bad8b58
signature: ec87d079039f9fc5c274826b1949d6cfd5a654e626e9d335dc33040b19555dbd
generated_at: 2026-11-10T03:36:54.098529+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-change-sessions-refresh.spec.ts

## Purpose

Verifies that a successful password change triggers a refetch of the device-sessions list. Because the backend (`postPasswordChange`) revokes every other session server-side, the sessions panel must update immediately; this test guards against the panel displaying stale, already-revoked sessions.

## Key elements

- **`changePassword`** (`vi.fn`) — Stub for the account-profile store's `changePassword` action; resolves successfully by default.
- **`fetchSessions`** (`vi.fn`) — Stub for the sessions store's refetch method; the test's primary assertion target.
- **`vi.mock('../stores/profile.ts')` / `vi.mock('../stores/sessions.ts')`** — Replace the real Pinia stores with the stubs above so the test isolates the component's orchestration logic.
- **`NEW_PASSWORD`** — A password string that satisfies the form's validation rules.
- **`mountForm()`** — Mounts `ProfilePasswordChange` with a real Pinia instance, Vuetify, and the app's i18n.
- **`submitValidChange()`** — Drives the form through a realistic interaction sequence (toggle open → fill current/new/confirm → submit) and returns the mounted wrapper.
- **`flushAll()`** — A single `setTimeout(0)` tick to let debounced breach checks and the submit promise chain settle.
- **`describe('a successful password change')` → `it('refetches the device-sessions list')`** — The single test case: asserts `changePassword` was called with the three password values and `fetchSessions` was called exactly once.

## Relationships

- **`src/modules/account/components/ProfilePasswordChange.vue`** — The component under test. Imported directly, mounted via `@vue/test-utils`, and driven through its `[data-test]`-annotated form controls.
- **`tests/unit/scripts/e2e/cypress-spec-globs.spec.ts`** — No direct code interaction is visible in this file; it appears in the dependency graph likely because a glob-based spec-collection test enumerates this file's path.

## Notes

- The test uses `submit.prevent` rather than a real HTTP round-trip; it is a unit-level integration test, not an e2e test.
- `flushAll` is a single tick — if a future change introduces additional async steps (e.g., a second debounce), the test may silently pass without exercising the new path.
- The mock for `../stores/profile.ts` replaces the entire module export, so any other exports from that store are unavailable to the component during the test.
