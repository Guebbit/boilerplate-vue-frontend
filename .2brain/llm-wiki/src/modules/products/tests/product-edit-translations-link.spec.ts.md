---
source: src/modules/products/tests/product-edit-translations-link.spec.ts
sha256: 9439e82b4a8cace4e44dbba1da45dfe1465c4fc642125469f237085b22a5c1a2
generated_at: 2026-10-02T15:37:41.714883+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-translations-link.spec.ts

## Purpose

Regression test for the LOCALES_OPTIONAL_0925 scenario: when the `locales` module is absent from the enabled module set, `ProductEdit.vue` must still render without throwing on the named-route lookup for `EntityTranslations`, and must simply omit the translations link. The test also confirms the link reappears when the route is present and the viewer has `read Translation` permission.

## Key elements

- **`routerWithTranslations` / `routerWithoutTranslations`** – Two `vue-router` memory-history routers; the second is built from `collectModuleRoutes(modulesWithoutLocales)` to simulate a build that ships no `locales` routes.
- **`modulesWithoutLocales`** – `enabledModules` filtered to exclude the `locales` module; drives the "route-missing" router.
- **`signInWithTranslationsPermission()`** – Populates the Pinia session store with a token, viewer, and a CASL `MongoAbility` granting `read Translation`, so the test isolates route-existence from permission checks.
- **`beforeEach` hook** – Resets `orvalMutator` and stubs `GET /locales` and `GET /products/p1/admin` responses via `orvalEnvelope` / `parseOrvalFixture`; also calls `loadLocale('en')`.
- **`describe('…route gone')`** – Asserts `mount(ProductEdit, …)` does not throw and `[data-test=translations-link]` is absent.
- **`describe('…route and permission')`** – Asserts the same selector *is* present when the route exists.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register module metadata (routes, store bindings) into the test runtime before any `describe` block runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – `orvalEnvelope` and `parseOrvalFixture` are used in the `beforeEach` mock to shape realistic API payloads for the `GET /locales` and `GET /products/p1/admin` responses, keeping the test's HTTP fixtures consistent with the generated Orval schema.

## Notes

- The file mocks `@/infrastructure/http` wholesale (`vi.mock`) but still imports the real `orvalMutator` reference to type-cast the mock — the actual HTTP transport is never exercised.
- Both routers use `createMemoryHistory` and a `/:locale` parent with `RouterView`; the product route is reached via `push('/en/products/p1/edit')` before mounting.
- The test does **not** verify the absence of the link when the route is present but the permission is denied; that path is covered elsewhere.
