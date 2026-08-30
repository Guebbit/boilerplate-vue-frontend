# src/modules/account/components/ProfileVerificationBanner.vue

## Purpose

A small Vuetify `v-alert` banner that appears on the profile page **only** when the loaded profile object exists and its `verified` field is explicitly `false`. It presents a single user action — resending the email-verification link — and reports the outcome via toast notifications.

## Key elements

- **`handleResendVerification`** – Calls `requestEmailVerification()` from the profile store. On success, pushes a "verification email sent" toast (i18n key `profile-page.verify-email-sent`); on failure, delegates to `notifyErrorMessages` so the user sees the relevant error (e.g. a 409 if already verified).
- **Template `v-if` guard** – `profile && profile.verified === false` ensures the banner is hidden when the profile hasn't loaded yet or is already verified (strict `false` check, so `null`/`undefined` won't trigger it).
- **Data-test attributes** – `data-test="verify-banner"` and `data-test="verify-resend"` are exposed for end-to-end / component tests.

## Relationships

- **`src/infrastructure/utils/errors.ts`** – Imported for `notifyErrorMessages`, which formats API errors into user-facing toast messages and passes them to the notifications store's `addMessage`.
- **`src/infrastructure/utils/logger.ts`** – Not imported directly here; reached transitively through the `errors.ts` utility (which likely logs before surfacing the message).
- **`src/modules/account/stores/profile.ts`** – Provides both the reactive `profile` ref (drives visibility) and the `requestEmailVerification` action.
- **`@guebbit/vue-toolkit` (notifications store)** – Supplies `addMessage` for the success/error toasts.

## Notes

- The component is intentionally stateless and has no local reactive state beyond the store refs — all logic lives in the profile store.
- The strict `=== false` check means the banner will **not** show when `verified` is `null` or `undefined`; it only appears once the API has returned a definitive unverified status.
- `storeToRefs` is used to keep `profile` reactive across re-renders (calling `useProfileStore()` directly in the template would work but breaks reactivity tracking for the ref).
