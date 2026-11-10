---
source: src/modules/account/tests/purchase-hold-notice.spec.ts
sha256: 97f2d11feeb194b09d27e57e2afa9dd5e09f3b329e678a6e89bb16b0470ee7ef
signature: 1701f57dc868779bbed76416d67233cbd6185a27e5f8d1f7b27a09e0c880eea1
generated_at: 2026-11-10T03:41:00.526916+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/purchase-hold-notice.spec.ts

## Purpose
Unit tests for the `PurchaseHoldNotice` banner. Verifies that the banner renders (or stays hidden) based on whether a valid, unexpired hold exists, displays the correct reason text, staff note, and conditional contact link, and that it fetches/reloads the account profile via the `refreshSignal` prop.

## Key elements
- **`profile`** (ref) — the single source of truth the mocked store exposes; each test assigns a `Partial<Account>` (or `undefined`) to drive render state.
- **`fetchProfile`** (vi.fn) — stand-in for the store's loader; tests assert it was called (no args on mount, `true` on refresh).
- **`vi.mock('../stores/profile.ts')`** — replaces the Pinia store with a plain `{ profile, fetchProfile }` object so no real Pinia instance is needed.
- **`vi.mock('pinia')`** — patches `storeToRefs` to be an identity function, matching the plain-object store shape.
- **`routerWith(withContact)`** — factory returning a `createMemoryHistory` router; conditionally includes a named `Contact` route to simulate builds that do or don't ship the tasks module.
- **`mountNotice(withContact?)`** — pushes `/`, awaits `router.isReady()`, then mounts the component with `router`, `vuetify`, and `i18n` plugins.
- **`describe('PurchaseHoldNotice')`** — six `it` blocks covering: no-hold → no render, expired-hold → no render, automatic hold text, staff note + contact link, missing-contact-route → no link, and mount + forced-reload behaviour.

## Relationships
- **`src/modules/account/components/PurchaseHoldNotice.vue`** — the component under test; imported, mounted, and queried via `data-test` attributes.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module scope before any test runs to wire account-module bindings into the application core.

## Notes
- The Pinia store mock is deliberately a plain object, not a real store; the `storeToRefs` identity mock is the glue that lets the component's `storeToRefs` call work unchanged.
- Contact-link assertions check for `?category=account` in the `href`, not just `/contact` — the category param routes the inquiry to the correct staff inbox.
- All DOM assertions use `[data-test=…]` attributes rather than class names, decoupling tests from Vuetify-generated markup.
- `loadLocale('en')` is awaited in `beforeEach`; without it the i18n plugin has no active locale and template strings may render as keys.
- The "expired hold" test uses a 2020 date, so it will stay green indefinitely without needing a moving clock.
