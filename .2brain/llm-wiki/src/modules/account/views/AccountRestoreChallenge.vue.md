---
source: src/modules/account/views/AccountRestoreChallenge.vue
sha256: e4b75db78f34c38846dfe6848378b4afb71e3951ea2820e83eca14d548c227dd
signature: e4b75db78f34c38846dfe6848378b4afb71e3951ea2820e83eca14d548c227dd
generated_at: 2026-11-10T03:45:25.597250+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/AccountRestoreChallenge.vue

## Purpose

The final step of signing in for an account that is in its deletion grace period. Credentials have been verified but no session exists yet; the visitor is presented with a binary choice—restore the account (redeeming the claim and starting a session) or abandon it, letting the scheduled purge proceed. It is a guest route: arriving here without a pending offer redirects back to `Login`.

## Key elements

- **`export default { name: 'AccountRestoreChallengePage' }`** — Separate `<script>` block that gives the SFC a stable component name for devtools and `<KeepAlive>`, since `<script setup>` cannot declare one.
- **`handleRestore`** — Calls `restore.restoreAndSignIn()`, then `redirectAfterLogin()` on success. On failure, reports the error into the local `restoreError` state (no field-level form error; the claim is simply spent or expired).
- **`handleLeave`** — Calls `restore.clear()` to drop the offer, then navigates to `Home`. The account remains locked and is erased on its schedule.
- **`onMounted` guard** — If `pending` is falsy (e.g., a stale reload or bookmark), immediately `router.replace`s to `Login`.
- **`onUnmounted(restore.clear)`** — Ensures a spent or abandoned offer does not persist in the store into the next visit of this route.
- **Template** — A single `<v-card>` with two block buttons (`data-test` attributes: `account-restore-challenge-restore` / `-leave`) and an `InlineErrorAlert` for the restore error. Entire card is hidden (`v-if="pending"`) when no offer exists.

## Relationships

- **`src/modules/account/stores/deletion-restore.ts`** — Primary data source. Provides `pending` (the offer), `loading` (in-flight flag), `restoreAndSignIn()` (redeem + session start), and `clear()` (discard the offer). Read via `storeToRefs` for reactivity.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — Provides `redirectAfterLogin()`, which routes the visitor to whatever destination they were headed before hitting the login wall.
- **`src/modules/account/tests/account-restore-challenge-view.spec.ts`** — Unit test suite covering this view's render, button interactions, and edge cases (no-offer redirect, error display).

## Notes

- The `eslint-disable` on the `onMounted` floating promise is intentional: vue-router surfaces failed navigations through the global `router.onError` handler (registered in `app/router/index.ts`), so the un-awaited `router.replace` is a known pattern here.
- `restoreError` is a **blocking** error (via `useBlockingError`), not a field-level validation error—there is no form field to attribute it to. It simply disables the restore button's success path and shows the `InlineErrorAlert`.
- The component is a **guest** (unauthenticated) route; it must not assume an existing session.
- The `data-test` attributes on both buttons and the error alert are the selectors the spec file targets; changing them will break the tests.
