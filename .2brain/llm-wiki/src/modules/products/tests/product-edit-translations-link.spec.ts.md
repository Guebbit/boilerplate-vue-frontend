---
source: src/modules/products/tests/product-edit-translations-link.spec.ts
sha256: ae82771db1e89efdfa5b7d3006d40202a4a278505dd67890f73a9d8da22e40de
signature: 910b23b216cb3fc5d2e08cd63ec07688616eefb3a8b60d2e0bfe7e8c2d50b92e
generated_at: 2026-11-10T05:28:34.651712+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-translations-link.spec.ts

## Purpose

Guards against `ProductEdit.vue` crashing when the `locales` module is absent from a build. A previous bug caused `:to="{ name: 'EntityTranslations' }"` to throw during render when that route was unregistered. This spec verifies the component either omits the link (route missing) or displays it (route present + permission granted), without throwing in either case.

## Key elements

- **`routerWithTranslations` / `routerWithoutTranslations`** – Two memory-history routers built via `collectModuleRoutes`; the former includes the `locales` module (and thus the `EntityTranslations` route), the latter filters it out.
- **`modulesWithoutLocales`** – `enabledModules` with `locales` removed; used to build the "no-route" router.
- **`ADMIN_PRODUCT`** – Minimal product fixture (id, title, price, one `en` translation) that the mocked GET `/products/p1` returns.
- **`signInWithTranslationsPermission()`** – Sets up a Pinia session with an `editor` role and a CASL ability to `read Translation`, isolating the route-existence check from the permission check.
- **`describe('…route gone')`** – Mounts `ProductEdit` under `routerWithoutTranslations`; asserts no throw and `[data-test=translations-link]` is absent.
- **`describe('…route and permission')`** – Mounts under `routerWithTranslations`; asserts the link is present.
- **`beforeEach`** – Resets Pinia, mocks `orvalMutator` to return locale list + product via `parseOrvalFixture`, and loads the `en` locale.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The component under test; the spec mounts it and inspects its DOM for the translations link.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers the module registry so `collectModuleRoutes` and `enabledModules` resolve correctly in the test environment.
- **`tests/support/unit/orval-fixture-schema.ts`** – `parseOrvalFixture` validates the mocked HTTP payloads against the Orval-generated OpenAPI schema, ensuring fixture shapes stay in sync with the API contract.

## Notes

- The test deliberately grants `read Translation` ability in *both* cases so that the presence/absence of the link is attributable solely to route registration, not to permission denial.
- `orvalMutator` is fully mocked at module level (`vi.mock('@/infrastructure/http', …)`); no real network calls are made.
- The `data-test=translations-link` attribute is the contract between the spec and the view; renaming it in `ProductEdit.vue` will silently break this test.
- `wireModulesIntoCore()` is called once at module scope (outside `beforeEach`), so it runs before any test and mutates shared state—other specs in the same worker must not rely on it being absent.
