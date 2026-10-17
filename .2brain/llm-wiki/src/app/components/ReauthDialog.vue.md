---
source: src/app/components/ReauthDialog.vue
sha256: 7790bd501f8c5e3c60a4f7a362ad5d039d4a10b2009e8f153f6529d3a15892f1
generated_at: 2026-10-17T00:05:50.100180+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/ReauthDialog.vue

## Purpose

A step-up re-authentication dialog that prompts the user to prove their identity (password, mailed code, and optionally a second-factor OTP) when a session's interceptor detects the need for a fresh token. It is mounted once alongside `<DialogHost />` in `LayoutDefault.vue`, queries the server for the applicable method, renders the matching form, and resolves the interceptor's parked requests on success.

## Key elements

- **`loadMethods()`** – Calls `useSessionStore().reauthMethods()`, stores the ordered list, and focuses the primary field on `nextTick`.
- **`submit()`** – Builds the `ReauthRequest` via the `proof` computed, calls `useSessionStore().reauth()`, then either `resolveStepUp()` (success) or clears fields and shows an inline error. Distinguishes 422 (wrong credential) from other failures.
- **`sendCode()`** – Requests a mailed code via `useSessionStore().sendReauthCode()`, starts the server-driven resend cooldown, and focuses the code field.
- **`startCooldown(seconds)`** – Drives the `cooldown` ref with a `setInterval`; cleared at zero, on reopen, and on unmount.
- **`proof`** (computed) – Returns a typed `ReauthRequest` or `undefined` while fields are empty; folds in the OTP when `otpRequired` is true.
- **`isOpen`** (computed, get/set) – Getter proxies `reauthDialog.isOpen`; setter calls `reauthDialog.rejectStepUp(new Error('REAUTH_CANCELLED'))` on close-by-Escape/scrim/cancel.
- **`otpRequired`** (computed) – True when the server's 401 challenge lists `otp` in `details.methods`.
- **`noMethod`** (computed) – True when the server returns an empty method list (account with no usable method).
- **Watch on `reauthDialog.isOpen`** – Resets all fields, clears errors, zeroes the cooldown, and re-invokes `loadMethods()` every time the dialog opens (immediate, so it also fires on mount if a prompt is already pending).
- **`useReturnFocus`** – Restores focus to the originating control after the dialog closes.
- **`useFullscreenDialog`** – Toggles Vuetify `fullscreen` on small viewports.

## Relationships

- **`@/infrastructure/session.ts`** – Primary consumer: calls `reauthMethods()`, `reauth()`, `sendReauthCode()`, reads `reauthing`, and uses the `reauthSendRetryAfter` helper to seed the cooldown on a 429.
- **`@/infrastructure/http/reauth-prompt.ts`** – Reads `isOpen`, `requiredMethods`; calls `resolveStepUp()` / `rejectStepUp()` to signal the interceptor.
- **`@/infrastructure/utils/errors.ts`** – Uses `getErrorMessage()` for generic error display and `absentIs(error, 422)` to detect a wrong-credential response.
- **`@/ui/composables/use-fullscreen-dialog.ts`** / **`use-return-focus.ts`** – UX helpers for responsive sizing and a11y focus management.
- **`src/infrastructure/utils/logger.ts`** (graph neighbor) – No direct import or call is visible in this file's script section.

## Notes

- The dialog is **persistent** (`persistent` prop) so Escape/scrim still close it, but the close path explicitly rejects parked requests rather than silently dropping them.
- On a wrong answer (422) the dialog stays open for a retry; on network/5xx it also stays open but surfaces the server's message so the user doesn't reflexively retype the same credential.
- `autofocus` is deliberately avoided (a11y lint); focus is set imperatively via `nextTick` + `.focus()` on the field ref.
- The cooldown timer (`ticker`) is a module-scoped `let`, cleared in three places: reaching zero, the reopen watcher, and `onUnmounted`. Forgetting any one leaks the interval.
- When `otpRequired` is true and the attempt fails with 422, the code skips the generic "wrong password/code" translation and uses `getErrorMessage(error)` instead, because the 422 may refer to either proof.
