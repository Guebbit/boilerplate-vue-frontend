---
source: tests/unit/app/reauth-dialog-error-message.spec.ts
sha256: efdcc4bdf5123430e0950dbed5674d2f9b06656e0b7c234b059c911efb90e958
generated_at: 2026-10-17T02:31:54.175951+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/reauth-dialog-error-message.spec.ts

## Purpose

Pins the error-message branch in `ReauthDialog.vue`: a 422 response must show the "wrong password" dictionary key, while any other failure (500, 401, network drop) must surface the API's own message instead. This file exists separately from `reauth-dialog.spec.ts` because it requires a real (unstubbed) `VDialog` — Vuetify teleports dialog content to `document.body` — and an identity `t` function so assertions read dictionary keys rather than locale-dependent translations.

## Key elements

- **`openDialog()`** — Creates a fresh Pinia instance, calls `useReauthPromptStore().requestStepUp()`, and mounts `ReauthDialog` with `attachTo: document.body` plus the real Vuetify plugin.
- **`passwordInput()`** — Queries `document` for `[data-test=reauth-dialog-password] input`; throws if the dialog form has not yet rendered.
- **`submitPassword(password)`** — Waits for the input to appear, sets its value via `DOMWrapper`, then triggers `submit` on the form.
- **`rejectsWith(envelope)`** — Returns a zero-arg function that, when called, rejects with a plain `{ status, message? }` object (mirroring `onResponseReject`'s shape rather than an `Error`).
- **`reauthMock`** — A `vi.fn()` stand-in for `useSessionStore().reauth`; each test sets its implementation to reject with a specific status code.
- **`describe('ReauthDialog — a failed attempt')`** — Four cases: 422 → wrong-password key; 500 → custom message; 401 → custom message (not wrong-password); and the password field is cleared after any failed attempt.

## Relationships

No dependency-graph neighbors are recorded for this file. It imports `ReauthDialog.vue`, the `useReauthPromptStore` from `reauth-prompt.ts`, and the Vuetify app from `@/ui/vuetify`, but these edges are not tracked in the graph.

## Notes

- **Teleported DOM.** `v-dialog` appends its overlay to `document.body`, outside the wrapper root. All DOM queries in this file read `document` directly; `wrapper.find()` would never see the dialog content.
- **Identity `t`.** The `vue-i18n` mock makes `t(key)` return the key string itself, so assertions match on dictionary keys (e.g. `reauth-dialog.error-wrong-password`) and are locale-independent.
- **`afterEach` body wipe.** Vuetify's `.v-overlay-container` persists on `<body>` across tests; `document.body.innerHTML = ''` prevents one test's dialog from leaking into the next.
- **`reauthSendRetryAfter` stubbed to `undefined`.** Prevents the session module from scheduling a real retry delay during tests.
- **ESLint suppression.** `rejectsWith` uses `Promise.reject` with a plain object (not an `Error`), matching the production reject envelope; the `@typescript-eslint/prefer-promise-reject-errors` rule is explicitly disabled for that line.
