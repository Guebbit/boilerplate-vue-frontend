---
source: src/modules/products/tests/product-edit-translations-link.spec.ts
sha256: 415a67cc4582650d9b2fb9f8f1342a19065f5b0ba8ffc9c9148829379902ac38
generated_at: 2026-10-17T01:32:34.507644+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-translations-link.spec.ts

## Purpose

Guards against a regression in `ProductEdit.vue` where the "translations" link assumed the `EntityTranslations` route always exists. Because the `locales` module is optional (enabled/disabled via `src/modules.ts`), a build without it has no such route; this spec proves the page still renders and simply omits the link, and that the link reappears when the route is present.

## Key elements

- **`modulesWithoutLocales`** – `enabledModules` filtered to exclude `locales`; used to build a router that lacks the translations route.
- **`routerWithTranslations` / `routerWithoutTranslations`** – Two `createRouter` instances (memory history) differing only in which module routes are registered under `/:locale`.
- **`ADMIN_PRODUCT`** – Minimal product fixture (`id`, `title`, `price`, `currency`, `translations`) returned by the mocked HTTP layer.
- **`signInWithTranslationsPermission()`** – Populates the Pinia session store with a token, viewer, and a CASL ability granting `read Translation`, isolating the route-existence assertion from the permission check.
- **`beforeEach`** – Resets the `orvalMutator` mock to answer `/locales` (locale list) and `/products/p1/admin` (product record), then loads the `en` locale.
- **`describe('…route gone…')`** – Mounts `ProductEdit` with `routerWithoutTranslations` and asserts `[data-test=translations-link]` is absent and no exception is thrown.
- **`describe('…route and permission…')`** – Mounts with `routerWithTranslations` and asserts the link is present.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The component under test; this spec mounts it and inspects the rendered translations link.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register test-time module wiring (stores, providers) before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – Provides `orvalEnvelope` and `parseOrvalFixture`, used to shape realistic API response objects for the `orvalMutator` mock.

## Notes

- The test asserts *both* that mounting doesn't throw **and** that the link element is absent. The throw was the original production bug (Vue's router resolves `:to` names at render time and throws on unknown names).
- `signInWithTranslationsPermission` grants the CASL ability *in both* scenarios so that a missing link can only be explained by the missing route, not by a permission denial.
- The `orvalMutator` mock is module-level (`vi.mock`) and manually reset per test; it intercepts two specific URLs and returns an empty envelope for anything else.
