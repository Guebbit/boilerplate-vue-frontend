---
source: src/modules/account/tests/password-reset-request-view.spec.ts
sha256: 5e13a342c1076bac4610adfc5cc3c07aff8fd29c7735e868f8c9e805f761ee5d
generated_at: 2026-10-02T12:26:49.917068+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-reset-request-view.spec.ts

## Purpose

Vitest spec for the `PasswordResetRequest.vue` view. Verifies that the "forgot password" form rejects invalid emails client-side, submits the typed address to the auth store, and routes API refusals to the correct place: field-named errors land on the email input, unnamed errors block the form in place.

## Key elements

- **`mountPage()`** — Spies on `useAuthStore().requestPasswordReset` *before* mounting (the view destructures at setup), then mounts the real component with the app router, Vuetify, i18n, and stubbed `LayoutDefault` / `HumanCheck`. Returns `{ wrapper, request }`.
- **`submitEmail(wrapper, email)`** — Sets the value on the inner `<input>` of the `data-test=password-reset-email` Vuetify wrapper and triggers form submit, awaiting `flushPromises`.
- **`emailMessage(wrapper)`** — Reads the `.v-messages` text under the email field; empty string means no field error.
- **`router`** — A memory-history router built from `collectModuleRoutes(enabledModules)` so the page's back-to-login link and route guards exercise the real route table.
- **`wireModulesIntoCore()`** (from `tests/support/unit/wire-modules.ts`) — Called at module scope to register enabled modules with the kernel registry before any route collection happens.
- **Four test cases** — invalid email (no store call, field message shown); valid email (store called with address + `undefined` antibot token, no error banner); 422 with `details.field: 'email'` (message on field, no banner); 500 with no field (banner `data-test=password-reset-request-error` appears).

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Imported and invoked at module top-level (`wireModulesIntoCore()`) to seed the kernel registry so `collectModuleRoutes(enabledModules)` in the router setup resolves real route definitions.
- **`contracts/rest/index.ts`** — The mocked rejection payloads in the 422/500 cases (`{ success, status, message, errors: [{ code, message, details }] }`) mirror the REST error-envelope contract; the test asserts the view's `onResponseReject` handler lifts `details.field` to the top-level `field` key that the contract defines.

## Notes

- The spy must be attached **before** `mount()` because `PasswordResetRequest.vue` destructures `requestPasswordReset` in its `<script setup>` block; spying after mount would miss the binding.
- `HumanCheck` is deliberately stubbed to a bare `<div />` so no real `GET /antibot/config` fires. Consequently the second argument to `requestPasswordReset` is always `undefined` here (the antibot token). The solved-token path is covered in `signup-antibot.spec.ts`.
- `data-test` attributes land on Vuetify's wrapper element, not the native `<input>`; helpers must target `… input` to read/write the actual value.
