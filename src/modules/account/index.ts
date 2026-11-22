/**
 * @module
 * Account — public barrel: everything this module offers a sibling to import.
 *
 * Unused exports are allowed on purpose: an export nobody imports yet costs nothing, and a missing
 * one makes the next author copy the logic.
 *
 * Never published: views, routes, the manifest, `response-schemas.ts` and locales, plus
 * `schemas.ts` unless a sibling imports it (it pulls the generated Zod contract into the entry
 * chunk, which `tests/cross-cutting/entry-chunk-budget.spec.ts` budgets).
 * The rule: `docs/understand/strategic-ddd.md` §5.
 */

export * from './stores/addresses';
export * from './stores/auth';
export * from './stores/deletion-restore';
export * from './stores/oauth-links';
export * from './stores/oauth-providers';
export * from './stores/profile';
export * from './stores/sessions';
export * from './stores/two-factor';
export * from './composables/use-countdown';
export * from './composables/use-method-label';
export * from './composables/use-password-breach-check';
export * from './composables/use-password-strength';
export * from './composables/use-post-login-redirect';
export { default as AddressFormDialog } from './components/AddressFormDialog.vue';
export { default as AddressPicker } from './components/AddressPicker.vue';
export { default as LinkTokenConfirmCard } from './components/LinkTokenConfirmCard.vue';
export { default as OAuthButtons } from './components/OAuthButtons.vue';
export { default as PasswordStrengthMeter } from './components/PasswordStrengthMeter.vue';
export { default as ProfileAddresses } from './components/ProfileAddresses.vue';
export { default as ProfileAvatar } from './components/ProfileAvatar.vue';
export { default as ProfileConnectedAccounts } from './components/ProfileConnectedAccounts.vue';
export { default as ProfileDeleteAccount } from './components/ProfileDeleteAccount.vue';
export { default as ProfileExportData } from './components/ProfileExportData.vue';
export { default as ProfilePasswordChange } from './components/ProfilePasswordChange.vue';
export { default as ProfileSessions } from './components/ProfileSessions.vue';
export { default as ProfileTwoFactor } from './components/ProfileTwoFactor.vue';
export { default as PurchaseHoldNotice } from './components/PurchaseHoldNotice.vue';
export { default as TermsAcceptanceCheckbox } from './components/TermsAcceptanceCheckbox.vue';
export { default as TwoFactorBackupCodes } from './components/TwoFactorBackupCodes.vue';
export { default as TwoFactorEnroll } from './components/TwoFactorEnroll.vue';
