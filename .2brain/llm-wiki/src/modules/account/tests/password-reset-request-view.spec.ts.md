---
source: src/modules/account/tests/password-reset-request-view.spec.ts
sha256: 57cf5829ac7e98c86fabe4dc2d1770b25014ef3e708895fead26b69c47d0fd0e
signature: d8438477a9b6805f4de26497e59ef8fde92b84e4074e284af7cf7d8c4516d38d
generated_at: 2026-11-10T03:37:36.467606+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-reset-request-view.spec.ts

## Purpose

Unit test for the "forgot password" page. Verifies client-side email validation, the exact payload sent to the auth store, and the two error-rendering paths (field-named vs. generic refusal). Mounts the real `PasswordResetRequest` component with the real router, Vuetify, and i18n plugins; only the store method and the antibot widget are faked.

## Key elements

- **`mountPage()`** – Creates a fresh Pinia, spies on `useAccountAuthStore().requestPasswordReset` *before* mounting (the view destructures the method during `setup`), then mounts the component with router/vuetify/i18n plugins and a stubbed `HumanCheck`.
- **`submitEmail(wrapper, email)`** – Sets the value on the inner `<input>` (because `data-test` sits on Vuetify's wrapper element) and triggers `form submit`.
- **`emailMessage(wrapper)`** – Reads the `.v-messages` text under the email field; empty string when valid.
- **`beforeEach`** – Resets Pinia, loads the `en` locale, and pushes the router to `/en/password-reset` so the page renders before each case.
- **Four test cases** – (1) invalid email → no store call + field message; (2) valid email → store called with `('address', undefined)`; (3) 422 with a field-named detail → message on the field, no banner; (4) 500 with no field → banner element present.

## Relationships

- **`src/modules/account/views/PasswordResetRequest.vue`** – The component under test; imported directly and mounted.
- **`src/modules/account/stores/auth.ts`** – Provides `useAccountAuthStore`; its `requestPasswordReset` method is spied and its resolution/rejection drives every assertion.
- **`tests/support/unit/fixtures.ts`** – Supplies `aProblem`, which builds Problem+ response bodies shaped to the REST contract, used to simulate API refusals.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level to register module metadata (routes, i18n keys) that the real router and i18n plugins expect.
- **`contracts/rest/index.ts`** – The REST contract types that shape the Problem+ response bodies produced by the `aProblem` fixture; the test's assertions on status codes and error detail structure follow this contract.

## Notes

- The spy **must** be attached before `mount()`; the view captures `requestPasswordReset` by reference during `setup`, so a spy created afterward would be inert.
- `HumanCheck` is stubbed to a bare `<div />` to prevent a real `GET /config` network call. Consequently the antibot token passed as the second argument to `requestPasswordReset` is always `undefined` here; the solved-token path is covered in `signup-antibot.spec.ts`.
- The `data-test` attribute lives on Vuetify's outer wrapper, not the `<input>`; selectors must include ` input` to reach the actual form control.
