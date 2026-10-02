---
source: src/app/components/ReauthDialog.vue
sha256: 647ba57f5a9cc476948df9f7500ddba16ba97378c2d18d7fcd7fd74b52c725af
generated_at: 2026-10-02T14:37:00.544355+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/ReauthDialog.vue

## Purpose
A step-up re-authentication prompt rendered as a Vuetify dialog. It is mounted once by `LayoutDefault.vue` alongside `<DialogHost />`, asks the server which authentication method the current account supports (password or mailed code), presents the appropriate form, and on success resolves the interceptor's parked requests via the session store. A failed attempt keeps the dialog open for retry.

## Key elements
- **`isOpen` (computed getter/setter)** — reads `reauthDialog.isOpen`; the setter calls `reauthDialog.rejectStepUp(new Error('REAUTH_CANCELLED'))` on any non-successful close (Escape, scrim, cancel button), rejecting all parked requests.
- **`loadMethods()`** — calls `useSessionStore().reauthMethods()`, stores the result, and focuses the relevant field on the next tick.
- **`submit()`** — builds a `ReauthRequest` from the active method and current input, calls `useSessionStore().reauth()`. On success resolves the step-up; on 422 shows a method-specific "wrong password/code" message; on other errors shows a generic message. Clears the input field in both failure cases.
- **`sendCode()`** — calls `useSessionStore().sendReauthCode()`, starts the server-returned cooldown, focuses the code field. On 429 starts the cooldown from the error's `retryAfter`.
- **`startCooldown(seconds)`** — sets a `setInterval` ticking `cooldown` down to zero; cleared on unmount and on re-open.
- **`proof` (computed)** — derives the `ReauthRequest` object or `undefined` if the relevant field is empty; gates the submit button's `:disabled`.
- **`method` / `noMethod` (computed)** — pick the first server-listed method or detect the empty-list dead-end.
- **Watch on `reauthDialog.isOpen`** — resets all state (password, code, sent, methods, error, cooldown) and re-fetches methods every time the dialog opens, including on mount (`immediate: true`).

## Relationships
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but no direct import or call is present in this file; no observable interaction.

## Notes
- Focus is applied manually via `nextTick` + `.focus()` rather than the `autofocus` attribute, because a11y lint flags `autofocus` on a dialog that may mount after first paint.
- Closing the dialog by any means other than a successful `submit()` rejects the interceptor's parked requests outright — there is no deferred "try later" path.
- The `immediate: true` flag on the `isOpen` watch covers the race where the component is created while a prompt is already open (e.g., hot-reload or late mount).
- The `cooldown` interval is only cleared in `onUnmounted` and at the zero boundary; it is *not* cleared if the component is hidden without unmounting (the dialog's `v-if="reauthDialog.isOpen"` guard means the card is destroyed, but the interval ref lives in the component scope).
- All user-facing strings go through `t()` with the `reauth-dialog.*` i18n namespace.
