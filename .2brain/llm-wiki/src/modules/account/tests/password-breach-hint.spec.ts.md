---
source: src/modules/account/tests/password-breach-hint.spec.ts
sha256: c25cb8c94b002c0bb19fbbd4f633cdef3446ed9d6972bea1bebbe3abb23d34d4
generated_at: 2026-10-02T12:26:01.543385+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-breach-hint.spec.ts

## Purpose

Verifies that the `usePasswordBreachCheck` composable is correctly wired into the three live forms that display a breach warning (`ProfilePasswordChange`, `PasswordResetConfirm`, `Signup`). It proves the integration path—input change → debounced API call → advisory warning render/dismiss—without re-testing the composable's own debounce logic (pinned separately in `use-password-breach-check.spec.ts`).

## Key elements

- **`responses`** (module-level `Record<string, unknown>`) — mutable map of HTTP endpoint keys (`"METHOD /path"`) to fixture payloads; overwritten per test case to control whether the breach check returns `breached: true/false`.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a stub that looks up `responses` by URL/method and wraps the result via `parseOrvalFixture`.
- **`checkCallCount()`** — helper that filters the mocked `orvalMutator` call log to count how many times `POST /account/password/check` was hit.
- **`mountPasswordChangeForm()` / `mountPasswordResetPage()` / `mountSignupPage()`** — thin `mount()` wrappers for the three components under test, each with the appropriate plugins (router, vuetify, i18n) and stubs (`LayoutDefault`, `RouterLink`, `HumanCheck`).
- **`DELAY = 500`** — the debounce window advanced via `vi.advanceTimersByTimeAsync` after each keystroke burst.
- **`describe` blocks** — one per form; each contains 1–3 `it` cases covering: warning appears on breach, burst-of-keystrokes collapses to one request, warning is advisory (never blocks submit), and warning clears when the password is changed to a non-breached value.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole mocked dependency. The test replaces `orvalMutator` so no real HTTP occurs; every assertion about "the API was called" reads from that mock's call log.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked once at module top-level to register the account module (routes, components) with the test kernel before any `mount` runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — provides `orvalEnvelope` (wraps a bare payload into the API's standard response envelope) and `parseOrvalFixture` (unwraps it back), used both in the mock implementation and when seeding `responses`.

## Notes

- The test suite is **integration-level for wiring, unit-level for the HTTP boundary**: it mounts real Vue components with real Vuetify/i18n plugins but stubs every external I/O (`orvalMutator`, `RouterLink`, `HumanCheck`).
- Fake timers are used exclusively; no real `setTimeout` ever elapses. The `DELAY` constant must stay in sync with the composable's debounce config.
- `RouterLink` and `HumanCheck` are stubbed in the Signup mount because their own behaviour is covered by other specs; leaving them unstubbed would require mocking `GET /antibot/config` and app-level static routes that are irrelevant here.
- The "advisory only" test intentionally uses a password that satisfies `usersPasswordSchema` composition rules so the form's own validation passes and the submit proceeds—proving the breach warning does not add a hard gate.
