---
source: src/modules/account/tests/link-token-confirm-card.spec.ts
sha256: ecb03b8838e28bc5a73a4becabeaa21ea68d157fc2d6950fd2352988a7fd4610
signature: 8d2290eceb6acaca36c417fac82fcb65de2cc931e64ece0b13a8c295a84bb04b
generated_at: 2026-11-10T03:34:45.573168+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/link-token-confirm-card.spec.ts

## Purpose

Vitest spec that exercises the shared `LinkTokenConfirmCard` behavior across three account pages (verify-email, email-change-undo, account-restore). It verifies that the token is prefilled from the `#token=` fragment, scrubbed from the URL on mount, spent exactly once on submit via the profile store, and that refusal keeps the form blocked in place with the appropriate error surface.

## Key elements

- **`mountPage(page, action)`** — Mounts a routed view with Pinia, Vuetify, i18n, and the real app router. Spies the named store action *before* mount (the view destructures it in `setup`) and spies `router.push` *after* mount (so the fragment scrub via `router.replace` still runs for real). Returns `{ wrapper, spend, navigate }`.
- **`submit(wrapper)`** — Triggers `submit` on the page's `<form>` and calls `flushPromises()` to let the async chain settle.
- **`router`** — A `createMemoryHistory` router wired with `collectModuleRoutes(enabledModules)` under a `/:locale` parent. Success assertions check the `push` call argument (route name), not an actual navigation.
- **`beforeEach`** — Resets Pinia and loads the `en` locale.
- **Test cases** — Cover: token prefill + URL scrub, spend-on-submit + redirect target, empty-token validation, store rejection blocks the form, undo page redirects to `Login`, account-restore tone (no `.v-alert`, no `bg-error` button), account-restore spend + `Login` redirect, field-specific 422 error rendered under the input, and fieldless refusal rendered as a card-level error.

## Relationships

- **`src/modules/account/stores/profile.ts`** — The `useAccountProfileStore` is the sole store dependency; each page's action (`confirmEmailVerification`, `undoEmailChange`, `restoreAccount`) is spied and mocked per test.
- **`src/modules/account/views/VerifyEmailConfirm.vue`**, **`EmailChangeUndo.vue`**, **`AccountRestore.vue`** — The three pages mounted and asserted against.
- **`tests/support/unit/fixtures.ts`** — Provides `aProblem(status, errors[])` to construct Problem+style rejection fixtures for the "refusal" and "field-specific error" cases.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register enabled modules into the core registry so `collectModuleRoutes` produces real routes.

## Notes

- The store spy is attached **before** `mount` (the view destructures the action in `setup`), while the `router.push` spy is attached **after** mount. This ordering is intentional: it lets the fragment scrub (`router.replace`) execute for real while still intercepting the success redirect.
- `router.push` is mocked to resolve `undefined`, so the success navigation is never actually performed; correctness is asserted purely on the spy's call arguments.
- `wireModulesIntoCore()` runs once at import time, outside any test block, and has no explicit teardown in this file.
