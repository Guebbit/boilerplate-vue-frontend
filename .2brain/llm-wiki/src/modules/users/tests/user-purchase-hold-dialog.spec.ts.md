---
source: src/modules/users/tests/user-purchase-hold-dialog.spec.ts
sha256: 8490c918bd2228946f5fb7b8f7a02de45e1c88fb109ecc086f7ea02711ee014f
signature: a47f3a6d7699ffdfc08556a1cb9f35adf628f2fa392fee4d8d40a0bacb12edec
generated_at: 2026-11-10T06:08:55.245371+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/tests/user-purchase-hold-dialog.spec.ts

## Purpose
Unit tests for the "pause checkout" dialog, verifying that it renders the target user's name, emits a `confirm` payload with a UTC end-of-day timestamp and trimmed note (or omits the note when blank), rejects dates before tomorrow with a visible error and a disabled confirm button, and emits `cancel` without side effects.

## Key elements

- **`mountOpen`** – Mounts `UserPurchaseHoldDialog` with `modelValue: false`, a stubbed `VDialog` (renders its slot unconditionally), Vuetify + i18n plugins, then sets `modelValue: true` via `setProps` and returns the open wrapper.
- **`tomorrow`** – Returns the date one day ahead of now as a `YYYY-MM-DD` string; used as the expected default `until` date in assertions.
- **`describe('UserPurchaseHoldDialog')`** – Five `it` blocks covering: display copy, confirm payload shape (end-of-day `T23:59:59.999Z` + trimmed note), blank-note omission, past-date rejection (disabled button + error message), and cancel emission.

## Relationships

- **`src/modules/users/components/UserPurchaseHoldDialog.vue`** – The component under test; mounted directly and exercised through its DOM (`[data-test=…]` hooks) and emitted events.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called at module load time to ensure DI/module registry side-effects are available before any test runs.

## Notes

- The `VDialog` stub (`{ template: '<div><slot /></div>' }`) sidesteps Vuetify's portal/transition internals so form content is always in the DOM; the same technique is used in `user-access-dialog.spec.ts`.
- `mountOpen` is **asynchronous** (returns the promise from `setProps`); every test `.then`s on its result rather than calling assertions synchronously.
- The expected `until` value is computed at assertion time via `tomorrow()`, so tests remain correct regardless of when the suite runs.
- `beforeEach` calls `loadLocale('en')` to guarantee i18n strings are available for text assertions.
