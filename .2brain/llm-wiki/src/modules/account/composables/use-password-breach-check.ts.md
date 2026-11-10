---
source: src/modules/account/composables/use-password-breach-check.ts
sha256: 14221d2037caccee0c16c1d7415dcafe2e31029ab76b7a6c4f759477fd1a64ed
signature: fed60dac77fd2d3bd0461222496772db73ca7bf01a37bbb4c8c618ce346f5288
generated_at: 2026-11-10T03:24:11.135042+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-password-breach-check.ts

## Purpose

Provides a debounced, advisory-only password breach check (via `POST /account/password/check`) for forms where the user is choosing a *new* password. It exists so the three password-entry forms share one small composable instead of duplicating debounce/race/scope-disposal logic. The result is display-only; it never blocks submission — the four password-SET endpoints remain the authoritative check.

## Key elements

- **`usePasswordBreachCheck(delayMs = 500)`** — the sole export. Returns `{ breached, checking, check }`.
  - `breached: Ref<boolean>` — whether the last *completed* check matched a known breach. Reset to `false` on empty input or on request failure.
  - `checking: Ref<boolean>` — true while a debounced request is in flight; useful for a quiet spinner.
  - `check(password: string)` — call on every `input` event. Empty string cancels the pending debounce and resets state to clean; non-empty queues the debounced POST.
- **`requestId` counter** (internal) — guards against out-of-order responses so a stale slower reply can't overwrite a newer verdict.
- **`onScopeDispose` hook** — cancels the pending debounce when the owning component unmounts, preventing a stray POST after the form is gone.

## Relationships

- **`src/modules/account/views/Signup.vue`**, **`src/modules/account/components/ProfilePasswordChange.vue`**, **`src/modules/account/views/PasswordResetConfirm.vue`** — the three consumers. Each calls `check()` on its password input and renders the `breached`/`checking` state as an advisory banner/spinner. They are the only places this composable is wired into a form.
- **`src/modules/account/tests/use-password-breach-check.spec.ts`** — unit tests covering debounce timing, empty-input reset, race-condition guard, and scope-disposal cancellation.
- **`@api` (`checkPasswordBreached`)** — the HTTP call the composable wraps.
- **`lodash-es` (`debounce`)** — trailing-edge debounce used for the send wrapper.

## Notes

- **Advisory contract:** a failed or network-error response sets `breached` to `false` (i.e., "clean") rather than surfacing an error. The composable must never alarm or block the user.
- **Rate budget:** the API allows ~20 requests per window per caller; the 500 ms default delay is chosen to stay well under that for human typing.
- **Trailing-edge only:** a rapid burst of keystrokes collapses into a single request for the final value — no leading-edge call is made.
- **Not a submit gate:** the four password-SET endpoints re-check server-side regardless of what this composable reported. Treat `breached` purely as a hint for the UI.
