---
source: src/modules/account/tests/password-reset-confirm-view.spec.ts
sha256: 6515f865e95ee889ae45b3fd0d32367b06a6ab11d08a48914cf54560d225011b
signature: e97d7d6f1eb727f75a3daa584b9d179c5b20dae324bb33d2367ce35c79400adb
generated_at: 2026-11-10T03:37:06.561771+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/password-reset-confirm-view.spec.ts

## Purpose

Tests the `PasswordResetConfirm` page in both `setup` and `reset` modes. The central assertion is the Terms-acceptance checkbox: it must be visible and unticked on the setup page, and on the reset page it must only appear after the API returns a 422 naming `termsAccepted`. Verifies that the tick is included in the `confirmPasswordReset` call only when the box is actually shown.

## Key elements

- **`mountPage(mode)`** – Mounts the real component with the app router, Vuetify, and i18n; spies on `confirmPasswordReset` *before* mounting so the store call is always captured.
- **`submit(wrapper, tick?)`** – Fills both password fields with `VALID_PASSWORD`, optionally checks the Terms input, triggers form submit, and flushes promises.
- **`termsBox(wrapper)`** – Locates the `[data-test=password-reset-terms-accepted]` element for assertion.
- **`VALID_PASSWORD`** – A literal (`'Str0ng!Passw0rd'`) that satisfies the shared password composition rule.
- **Setup-mode `describe`** – Three cases: box is present & unticked; submit without tick calls nothing; submit with tick calls the store with `true`.
- **Reset-mode `describe`** – Two cases: box absent and `undefined` passed on success; box appears after a 422 with `field: 'termsAccepted'`, then a second submit sends `true`.

## Relationships

- **`src/modules/account/views/PasswordResetConfirm.vue`** – The component under test; mounted directly with the `mode` prop.
- **`src/modules/account/stores/auth.ts`** – Provides `useAccountAuthStore`; its `confirmPasswordReset` action is the sole spied unit under test.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope so `collectModuleRoutes(enabledModules)` can resolve real routes for the in-memory router.
- **`tests/support/unit/fixtures.ts`** – Supplies `aProblem(422, …)` to construct the Problem+JSON rejection that triggers the Terms-box display in reset mode.

## Notes

- The spy is created inside `mountPage` *before* `mount()` runs. Tests that call `submit` without first calling `confirm.mockResolvedValue/RejectedValueOnce` will let the real store implementation execute—setup-mode "sends nothing" test relies on the box being absent to short-circuit, while reset-mode tests always mock first.
- `RouterLink` is globally stubbed to a plain `<a>` because the Terms/Privacy destinations live in a module not registered on this test router.
- `wireModulesIntoCore()` runs once at import time (not in `beforeEach`); it mutates module-level registry state.
- The reset-mode "422 → box appears → resubmit" test models a real two-call flow: `mockRejectedValueOnce` then `mockResolvedValue` on the same spy.
