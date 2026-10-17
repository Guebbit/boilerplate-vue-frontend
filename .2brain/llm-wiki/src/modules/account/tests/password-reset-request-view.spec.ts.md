---
source: src/modules/account/tests/password-reset-request-view.spec.ts
sha256: a1d1df44ef0e568702b4de0751033ec40d668f09b67201afd6d87261f5ed05aa
generated_at: 2026-10-17T00:23:50.771475+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-reset-request-view.spec.ts

## Purpose

Vitest unit tests for the "forgot password" page (`PasswordResetRequest.vue`). Verifies four behaviors: client-side email validation blocks submission, a valid email reaches the auth store, a field-named API error renders under the input, and a non-field API error shows an inline banner. The real component, router, and Pinia store are used; only `requestPasswordReset` and `HumanCheck` are stubbed.

## Key elements

- **`mountPage()`** – Spies `useAuthStore().requestPasswordReset` *before* mounting (the view destructures it in `<setup>`), then mounts the real component with the app router, Vuetify, and i18n. Returns `{ wrapper, request }`.
- **`submitEmail(wrapper, email)`** – Sets the value on the inner `<input>` (the `data-test` attribute lands on Vuetify's wrapper) and triggers a form submit, then flushes promises.
- **`emailMessage(wrapper)`** – Reads the `.v-messages` text under the email field; empty string when the field is valid.
- **`describe('PasswordResetRequest')`** – Four test cases:
  - Invalid email → `requestPasswordReset` not called, field message present.
  - Valid email → called exactly once with `(email, undefined)` (antibot token is absent due to the HumanCheck stub); no error banner.
  - 422 with `details.field: 'email'` → message appears under the input, no banner.
  - 500 with no field → `[data-test=password-reset-request-error]` element exists.
- **Router setup** – `createMemoryHistory` + `collectModuleRoutes(enabledModules)` under `/en/password-reset`, so the "back to login" link resolves through the real route table.

## Relationships

- **`src/modules/account/views/PasswordResetRequest.vue`** – The component under test; mounted directly.
- **`src/modules/account/stores/auth.ts`** – `useAuthStore().requestPasswordReset` is the spied method; tests assert on its call args and mock its resolved/rejected values.
- **`contracts/rest/index.ts`** – The mocked rejection shapes (`{ success, status, message, errors: [{ code, message, details: { field } }] }`) mirror the REST error contract; `onResponseReject` in the view lifts `details.field` to `field`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register enabled-module routes into the kernel registry so `collectModuleRoutes` yields the account module's route.

## Notes

- **Spy ordering matters:** `vi.spyOn` must run before `mount()` because the view captures `requestPasswordReset` via destructuring in `<script setup>`. Swapping the order makes the spy a no-op.
- **HumanCheck stub:** Replacing `HumanCheck` with a bare `<div />` prevents a real `GET /antibot/config` request. This also means the second argument to `requestPasswordReset` (`withAntibotToken`) is always `undefined` here; the token-present path is covered in `signup-antibot.spec.ts`.
- **Vuetify selector quirk:** `data-test` attributes land on the Vuetify wrapper element, not the native `<input>`, so all queries target `'[data-test=…] input'` or `'[data-test=…] .v-messages'`.
- **Locale must be loaded** in `beforeEach` (`loadLocale('en')`) before the router navigates, otherwise i18n messages are missing and field-error assertions are unreliable.
