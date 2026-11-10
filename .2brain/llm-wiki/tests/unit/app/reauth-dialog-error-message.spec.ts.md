---
source: tests/unit/app/reauth-dialog-error-message.spec.ts
sha256: 075b09aab84a7bc35ae6f58235e3e48084a5fc4e8d6471ffe4f23b151a8a35a0
signature: 484530898cd3210140aac62cbeae4b092610e97a9791f5dc86f7af5f0308762d
generated_at: 2026-11-10T07:48:27.915079+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/reauth-dialog-error-message.spec.ts

## Purpose

Pins the one error-message branch in `ReauthDialog.vue` that is easy to regress: only a **422** status should render the "wrong password" dictionary key; every other failure (401, 5xx, network) must surface the rejection envelope's own `message`. The file exists separately from the general `reauth-dialog.spec.ts` coverage because it requires an unstubbed `VDialog` (Vuetify teleports to `document.body`) and an identity `t` function, neither of which is compatible with the other spec's stubbed mount and real-locale setup.

## Key elements

- **`openDialog()`** — creates a fresh Pinia, triggers `useReauthPromptStore().requestStepUp()`, and mounts `ReauthDialog` with `attachTo: document.body` plus the real Vuetify plugin.
- **`passwordInput()`** — queries `document` for `[data-test=reauth-dialog-password] input`; throws if the dialog form has not rendered yet.
- **`submitPassword(password)`** — waits (via `vi.waitFor`) for the input to exist, sets its value, then triggers `submit` on the `<form>` element.
- **`rejectsWith(envelope)`** — returns a zero-arg function that rejects with a plain `{ status, message? }` object, matching the shape `onResponseReject` produces in production.
- **`describe('ReauthDialog — a failed attempt')`** — four cases:
  - 422 → asserts the `reauth-dialog.error-wrong-password` key appears.
  - 500 with a message → asserts that message appears *and* the wrong-password key does not.
  - 401 → asserts the session-gone message appears, not the wrong-password key.
  - Password field is cleared after a failed 422 attempt, so a retry starts empty.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **All DOM queries go through `document`, not `wrapper.find()`.** Vuetify's `v-dialog` teleports its content into a `.v-overlay-container` appended to `<body>`, so it is invisible to the test-utils wrapper regardless of `attachTo`.
- **`afterEach` clears `document.body.innerHTML`.** Vuetify appends one overlay container per mount; without cleanup, a prior test's dialog would leak into the next test's `document` queries.
- **`t` is mocked to the identity function** (`key → key`), so assertions match raw dictionary keys (e.g. `reauth-dialog.error-wrong-password`) rather than locale-specific translations. The point is *which* key is chosen, not what it says.
- **`rejectsWith` rejects with a plain object, not an `Error`.** This mirrors the actual reject envelope produced by the API client's `onResponseReject`; the `eslint-disable` comment documents the intentional deviation.
- **`submitPassword` uses `vi.waitFor`** because `v-dialog` mounts its content one tick after `mount()` resolves; the input does not exist synchronously.
