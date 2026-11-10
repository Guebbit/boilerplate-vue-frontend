---
source: src/modules/account/tests/password-breach-hint.spec.ts
sha256: 966575a2b3d896a078cf9bdddad2b73e580c9f691a0342932a79074b93638776
signature: 7ce37de1d2a4136e64c8be7ca4224ea523ef6a173a601b840a78d153731a7b4b
generated_at: 2026-11-10T03:36:42.780448+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-breach-hint.spec.ts

## Purpose

Integration test that mounts the three real forms `usePasswordBreachCheck` is wired into (ProfilePasswordChange, PasswordResetConfirm, Signup) to verify the **wiring** — that the breach warning appears, clears, and never blocks submission. It does not test the composable's debounce logic in isolation; that is covered by `use-password-breach-check.spec.ts`.

## Key elements

- **`DELAY`** (500 ms) — the amount fake timers are advanced to let the debounced check fire.
- **`router`** — a `createMemoryHistory` router carrying the real module routes, shared by the two page-level mounts.
- **`responses`** — mutable per-test record mapping `"METHOD /path"` to the fixture payload returned by the mocked HTTP layer.
- **Mocked `orvalMutator`** — replaces the real HTTP mutator with a fn that resolves `parseOrvalFixture` against `responses`.
- **`checkCallCount()`** — helper that counts how many times the mutator was invoked for `POST /account/password/check`.
- **`mountPasswordChangeForm()`** — mounts `ProfilePasswordChange` (no router needed).
- **`mountPasswordResetPage()`** — mounts `PasswordResetConfirm` with router, vuetify, i18n.
- **`mountSignupPage()`** — mounts `Signup` with router, vuetify, i18n; stubs `RouterLink` and `HumanCheck`.
- **`beforeEach` / `afterEach`** — enables fake timers, resets Pinia, resets config, sets default `breached: false` response, loads the `en` locale; restores real timers after each test.
- **Three `describe` blocks** — one per form, each asserting warning visibility, debounce collapse (keystroke burst → 1 request), and (for ProfilePasswordChange) that submit still succeeds despite a breached flag.

## Relationships

- **`src/infrastructure/http/index.ts`** — the `orvalMutator` export is the sole HTTP seam; the suite intercepts its calls to verify the check endpoint is hit and inspects the call log for `POST /account/password` to confirm submit still fires.
- **`src/modules/account/components/ProfilePasswordChange.vue`** — the primary component under test; the suite drives its toggle, password inputs, and form submit.
- **`src/modules/account/views/PasswordResetConfirm.vue`** — mounted through the shared router; the suite verifies warn-then-clear on password re-entry.
- **`src/modules/account/views/Signup.vue`** — mounted through the shared router with `RouterLink`/`HumanCheck` stubbed; the suite verifies the breach warning appears on the password field.
- **`tests/support/unit/orval-fixture-schema.ts`** — `parseOrvalFixture` shapes the raw `responses` payload into the Orval-expected response object returned by the mocked mutator.
- **`tests/support/unit/config-answer.ts`** — `configAnswer()` supplies the `GET /config` body required by the Signup page's initial render.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register enabled modules so `collectModuleRoutes` can build the router's route table.

## Notes

- **Advisory-only contract:** the ProfilePasswordChange suite explicitly asserts that a strong-but-breached password still results in a successful `POST /account/password`. The breach hint must never gate submission.
- **Fake timers, not real waits:** the 500 ms delay is advanced via `vi.advanceTimersByTimeAsync`; no real `setTimeout` ever elapses.
- **Module-scope side effect:** `wireModulesIntoCore()` runs once at import time, outside any `describe`; it mutates global module registry state for the whole process.
- **Signup stubs are deliberate:** `RouterLink` is stubbed because the module-only router doesn't register app-level static-page routes; `HumanCheck` is stubbed because its config-fetch logic belongs to `human-check.spec.ts`, not here.
- **Debounce isolation boundary:** this file asserts *that* the composable fires (one call after a keystroke burst) but does not assert *when* or *how* the debounce window works — that is the composable spec's responsibility.
