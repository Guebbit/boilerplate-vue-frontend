# tests/support/unit/wire-modules.ts

## Purpose

Provides a single-call helper for unit tests that exercise module-registered subsystems (response-schema validation, i18n dictionaries) without booting the full app. Because `infrastructure` is the bottom layer and cannot import `@/modules`, tests must inject the collected schemas and locale contributors the same way the composition root does at boot; without this wiring, i18n keys render as their own names and response schemas go unvalidated—a silent pass that looks like a green test but verifies nothing.

## Key elements

- **`wireModulesIntoCore(): void`** — the sole export. Calls `registerResponseSchemas(collectModuleResponseSchemas(enabledModules))` and `registerLocaleContributors(collectModuleLocales(enabledModules))` to populate the core runtime's schema map and i18n registry with every enabled module's contributions.

## Relationships

- **`@/modules` (`enabledModules`)** — the source of truth for which modules are active; this file reads that list and delegates collection to the kernel registry.
- **`@/infrastructure/http/response-schema-map`** — receives the aggregated schema rows via `registerResponseSchemas`.
- **`@/infrastructure/i18n`** — receives locale dictionaries via `registerLocaleContributors`.
- **`@/kernel/registry`** — provides `collectModuleResponseSchemas` and `collectModuleLocales`, the aggregation functions that walk the module list.
- **Module spec files** (e.g. `src/modules/products/tests/product-view.spec.ts`, `src/modules/wishlist/tests/wishlist-view.spec.ts`, `src/modules/account/tests/login-view-i18n.spec.ts`, and the `schemas-i18n.spec.ts` files across orders, products, users) — these specs import and call `wireModulesIntoCore()` in a `beforeAll`/setup step so their assertions see real i18n strings and validated responses rather than identity-mapped keys and empty schema maps.
- **`docs/reference/tests.md`** — documents the test-support conventions, including the requirement to call this helper in specs that touch i18n or response validation.

## Notes

- **Incompatible with `vi.resetModules()`.** After a reset, the spec's `@/infrastructure/*` imports are a *different* module instance than the one this file bound to at import time, so the registrations land in the old instance and the spec's new instance stays empty. Specs that need a reset (e.g. `tests/unit/infrastructure/http/http-validate-responses.spec.ts`) must re-wire inline against their freshly imported instances instead of calling this helper.
- Calling the function multiple times is idempotent only if the module list hasn't changed; it does not deduplicate or unregister previous entries.
