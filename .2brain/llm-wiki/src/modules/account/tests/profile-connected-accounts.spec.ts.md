---
source: src/modules/account/tests/profile-connected-accounts.spec.ts
sha256: 1238d0a31dacceca2c8b265d9083d9e4695704faab9fd535767bc0247f4aacb0
generated_at: 2026-10-17T00:25:11.154088+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-connected-accounts.spec.ts

## Purpose

Unit tests for the `ProfileConnectedAccounts.vue` panel. Verifies three behaviours: provider rows render the human-readable label, an empty-state element appears when no links exist, and the remove button gates the store's `unlinkProvider` call behind a `useDialogStore().confirm` prompt.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope (outside any `describe`) to register modules the component depends on before any test runs.
- **`links`** — mutable array standing in for the store's current list; reset in `beforeEach` to a single GitHub entry.
- **`unlinkProvider`** — `vi.fn()` that stands in for the store's removal action; assertions target this.
- **`vi.mock('../stores/oauth-links.ts', …)`** — replaces the real Pinia store with a plain object exposing `links`, `fetchLinks`, and `unlinkProvider`.
- **`vi.mock('pinia', …)`** — patches `storeToRefs` to an identity function because the mocked store is not a real Pinia store.
- **`mountPanel()`** — helper that mounts the component with `createPinia()`, `vuetify`, and `i18n` plugins.
- **`beforeEach`** — clears all mocks, resets `links`, and awaits `loadLocale('en')`.
- **Test cases** (4):
  - Provider label appears in `[data-test="connected-item"]`.
  - `[data-test="connected-empty"]` exists when `links` is empty.
  - Declined confirmation → `unlinkProvider` is **not** called.
  - Accepted confirmation → `unlinkProvider` **is** called with `'github'` (uses `vi.waitFor`).

## Relationships

- **`src/modules/account/components/ProfileConnectedAccounts.vue`** — the system under test; mounted via `mountPanel()` and queried through `data-test` attributes.
- **`tests/support/unit/wire-modules.ts`** — exports `wireModulesIntoCore()`, called once at the top of the module before Vitest processes any `describe` block. Ensures the component's module-level dependencies (i18n, stores, etc.) are registered in the test environment.

## Notes

- The Pinia `storeToRefs` mock is a workaround: the OAuth-links store is faked as a plain object, so the real `storeToRefs` (which expects a Pinia store instance) would break. The identity replacement is safe only because the component reads `store.links` / `store.unlinkProvider` directly.
- `loadLocale('en')` returns a promise and is placed in the `beforeEach` return chain; forgetting it would cause i18n keys to be unresolved in the first test.
- Selectors are `data-test` attributes (`connected-item`, `connected-empty`, `connected-remove`), not CSS classes or text — add them in the component if you add new testable elements.
- The "accepted" test uses `vi.waitFor` (polling) while the "declined" test uses a plain `.then()` chain. Both are valid, but the polling form is more resilient if the component adds extra microtasks.
