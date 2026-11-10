---
source: src/app/components/ReauthDialog.vue
sha256: b40dfd0504463af314d7781cb69b69443523ee03f59a68b5776bf7ff461ab812
signature: 5714698f9a030943a9d278058d0be3b38fb84f4c568747fa821e9952313864b7
generated_at: 2026-11-10T02:53:13.086298+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/ReauthDialog.vue

## Purpose

Step-up re-authentication dialog. It is mounted once in `LayoutDefault.vue` (beside `<DialogHost />`) and reacts to the reauth-prompt store: when an interceptor parks a request on a 401, this dialog asks the server which method the account can use (password or emailed code), renders the appropriate form, and on submit calls `useReauthStore().reauth()` directly. A wrong answer keeps the dialog open for retry; any other close rejects the parked requests.

## Key elements

- **`loadMethods()`** – fetches the ordered method list via `reauthMethods()`; focuses the first field on success, shows an error on failure.
- **`submit()`** – builds the `ReauthRequest` (password / email code + optional OTP), calls `useReauthStore().reauth()`, resolves or rejects the prompt store accordingly.
- **`sendCode()`** – requests an emailed code via `sendReauthCode()`, starts the server-provided cooldown, focuses the code field.
- **`startCooldown(seconds)`** – sets a 1-second `setInterval` countdown; auto-clears at zero.
- **`proof`** (computed) – assembles the `ReauthRequest` object from the active method and OTP; `undefined` while any required field is empty.
- **`isOpen`** (computed, get/set) – wraps `reauthDialog.isOpen`; the setter calls `reauthDialog.rejectStepUp(new Error('REAUTH_CANCELED'))` on close.
- **`otpRequired`** (computed) – true when `reauthDialog.requiredMethods` includes `'otp'` (driven by the original 401, not the profile).
- **`noMethod`** (computed) – true when the server returns an empty method list (dead-end state).
- **`watch(reauthDialog.isOpen, …, { immediate: true })`** – resets all form state and re-fetches methods each time the prompt opens; `immediate` covers the case where the component mounts while a prompt is already active.
- **Template** – `DialogShell` (persistent, `role="alertdialog"`), Vuetify `v-card` with password form, email-code form (send button + cooldown label + code field), optional OTP field, progress bar while loading, and a warning alert for the no-method dead end.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – listed as a graph neighbor, but no direct import or call to a logger is visible in this file's source.

## Notes

- **No `autofocus` attribute.** Focus is set manually via `nextTick(() => field.value?.focus())` because the a11y lint rule forbids the HTML `autofocus` attribute (it fires on first paint even for a dialog that opens later).
- **`persistent` on `DialogShell`.** The dialog cannot be dismissed by clicking the scrim; only the explicit close/cancel path (or Escape) triggers the `isOpen` setter and rejects parked requests.
- **Failure semantics are split.** A 422 without OTP uses a fixed "wrong password/code" i18n string; a 422 *with* OTP (or any other status) falls back to `getErrorMessage`, because the server's message identifies which factor was wrong.
- **Floating promises** (`nextTick`, `loadMethods`) are intentionally not `await`ed and carry inline `eslint-disable` comments explaining why they cannot reject.
- **Cooldown on 429.** If `sendCode()` is rejected with a 429, the `retryAfter` value (extracted by `reauthSendRetryAfter`) drives the countdown, preventing rapid re-clicks while the server is still refusing.
- **All form state is cleared on open.** Password, code, OTP, `sent` flag, and error message are reset in the `isOpen` watcher; values are never carried over between unrelated step-up prompts.
