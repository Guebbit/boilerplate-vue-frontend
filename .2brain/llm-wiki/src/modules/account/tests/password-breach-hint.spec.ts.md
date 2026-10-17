---
source: src/modules/account/tests/password-breach-hint.spec.ts
sha256: 3397ffe3c1dece3f4d36ed84855f5dc261a46677c2d320fd3c7ec1a2788ecf08
generated_at: 2026-10-17T00:23:28.038733+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-breach-hint.spec.ts

## Purpose

Wiring-level integration test that mounts the three real Vue forms (`ProfilePasswordChange`, `PasswordResetConfirm`, `Signup`) to prove `usePasswordBreachCheck` is correctly connected in each. It does **not** test the debounce logic in isolation (that lives in `use-password-breach-check.spec.ts`); it asserts that typing a password triggers the `POST /account/password/check` endpoint and that the `[data-test=password-breach-warning]` element appears and clears as expected.

## Key elements

- **`DELAY`** — constant (500 ms) used with `vi.advanceTimersByTimeAsync` to let the debounced call fire under fake timers.
- **`router`** — memory-history Vue Router carrying the real module routes from `collectModuleRoutes(enabledModules)`; needed by the two page-level components.
- **`responses`** — mutable `Record<string, unknown>` keyed by `"METHOD /path"`; each test overwrites entries before acting to control mock responses.
- **`checkCallCount()`** — counts how many times the mocked `orvalMutator` was invoked for `/account/password/check`.
- **`mountPasswordChangeForm()`** — mounts `ProfilePasswordChange` with Vuetify + i18n (no router needed).
- **`mountPasswordResetPage()`** — mounts `PasswordResetConfirm` with router, Vuetify, i18n.
- **`mountSignupPage()`** — mounts `Signup`; stubs `RouterLink` and `HumanCheck` to avoid app-level routes and antibot config.
- **`describe('ProfilePasswordChange')`** — three tests: warning appears on breach, burst of keystrokes collapses to one request, submit is never blocked (advisory-only).
- **`describe('PasswordResetConfirm')`** — warning appears on breach and clears once a clean value is typed.
- **`describe('Signup')`** — warning appears on a breached candidate in the signup password field.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/infrastructure/http/index.ts` | `orvalMutator` is the sole HTTP entry point; replaced entirely via `vi.mock` with a factory that routes on `METHOD url` and returns `parseOrvalFixture`-shaped envelopes. |
| `src/modules/account/components/ProfilePasswordChange.vue` | Import and mount as the primary test subject in the first `describe` block. |
| `src/modules/account/views/PasswordResetConfirm.vue` | Import and mount as the test subject in the second block; requires the shared `router` to resolve its route. |
| `src/modules/account/views/Signup.vue` | Import and mount in the third block; `RouterLink` and `HumanCheck` are stubbed so the module-only router and antibot endpoint are never exercised. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is called at module scope to register Pinia stores / module side-effects before any mount. |
| `tests/unit/infrastructure/http/orval-fixture-schema.ts` | `orvalEnvelope` and `parseOrvalFixture` shape every mock response so the composable sees a realistic Orval envelope. |

## Notes

- **Fake timers are mandatory here.** The debounce delay is a real `setTimeout`; awaiting it in real time would make the suite slow and flaky. Every test advances by exactly `DELAY` (500 ms) via `vi.advanceTimersByTimeAsync`.
- **`responses` is intentionally mutable.** Tests set it in `beforeEach` to a safe default (`breached: false`) and then overwrite specific keys per-test. There is no per-test isolation of the object itself — `vi.clearAllMocks()` resets call counts but the object is reassigned each `beforeEach`.
- **Advisory-only contract.** The `ProfilePasswordChange` "never blocks the submit" test is the key regression guard: even when `breached: true`, the `POST /account/password` mutation must still fire. If a future change turns the hint into a gate, this test will catch it.
- **Mock key format is `"METHOD url"`** (e.g. `"POST /account/password/check"`). Adding a new endpoint to `responses` without matching this exact key will silently return `undefined` from `parseOrvalFixture`.
