---
source: src/modules/account/composables/use-password-breach-check.ts
sha256: bacf6fd6582e2569d702f6f5edf31e5b7d1f6f2f9f67096afe3b173ec83714a2
generated_at: 2026-10-02T12:14:42.571921+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-password-breach-check.ts

## Purpose

Vue composable that wires a debounced advisory password-breach check (via `POST /account/password/check`) into any form that collects a brand-new password. It exists to give the visitor a soft "this password appears in a breach list" hint while typing, without becoming a submit gate — the four password-SET endpoints remain the authoritative check. Shared across `Signup.vue`, `ProfilePasswordChange.vue`, and `PasswordResetConfirm.vue`.

## Key elements

- **`usePasswordBreachCheck(delayMs?: number)`** — the sole export. Accepts an optional debounce delay (default 500 ms) and returns `{ breached, checking, check }`.
- **`breached`** (`Ref<boolean>`) — whether the last *completed* check matched a known-breached password. Display-only signal.
- **`checking`** (`Ref<boolean>`) — true while a debounced request is in flight; lets callers render a quiet spinner.
- **`check(password: string)`** — call on every input event. Cancels a pending debounce and resets both refs to clean when the password is empty; otherwise queues a trailing-edge debounced request.
- **`requestId` counter** (internal) — increments per request; stale in-flight responses are discarded so an out-of-order answer can't flash a wrong verdict.
- **`onScopeDispose` cleanup** — cancels the pending debounce when the component unmounts within the delay window, preventing a ghost POST of the typed password.

## Relationships

No graph neighbors are tracked for this file. (It imports `checkPasswordBreached` from `@api`, `getPayloadFromResponse` from `@/infrastructure/http/envelope.ts`, and the `PasswordCheck` type from `@types`, but none are listed as graph-neighbor files.)

## Notes

- **Advisory contract:** a failed or timed-out breach check silently resets `breached` to `false`. It must never alarm the user or block submission.
- **Rate-limit awareness:** the endpoint allows roughly 20 requests per window per caller (per `docs/api/regenerating.md` contract notes). The 500 ms default debounce keeps a human-paced typist well under that budget; do not lower it without re-checking that contract.
- **Not a gate:** any of the three consuming forms can submit even when `breached` is `true`. The server-side SET endpoints re-verify independently.
- **Trailing-edge only:** lodash `debounce` is used with defaults (no leading edge), so a keystroke burst collapses into a single check for the final typed value.
- **Empty-password path:** `check('')` does not just skip the request — it explicitly cancels any pending debounce *and* resets both reactive refs, ensuring a cleared field immediately shows no warning.
