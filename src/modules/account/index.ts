/**
 * @module
 * Account — public barrel.
 *
 * `AddressPicker`, for `cart`'s checkout to mount the address choice without reaching into this
 * module's stores or its own add/edit dialog directly. `useAuthStore`, for `src/app`'s
 * `ReauthDialog` to step up a session the interceptor flagged. `useProfileStore` and
 * `emailVerifyResendRetryAfter`, for `src/app`'s verification banner to resend the address-proof
 * email and read the server's own cooldown off a 429 — both shell components render on every page,
 * but the call and its rules stay owned here.
 */

export { default as AddressPicker } from './components/AddressPicker.vue';
export { useAuthStore } from './stores/auth';
export { emailVerifyResendRetryAfter, useProfileStore } from './stores/profile';
