---
source: src/modules/products/tests/product-edit-tax-class.spec.ts
sha256: bac29b9ff16f75e58eade31ab636244b3b9fea265447cf100f20638f1e379c12
signature: 886455bfae32bea40404936dfe3472b742c6f43d6d4a018e8ed5d860a4074416
generated_at: 2026-11-10T05:28:24.091444+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/product-edit-tax-class.spec.ts

## Purpose

Verifies that the `ProductEdit` form correctly round-trips the `taxClass` field: it hydrates the value from the admin record, treats a missing class as an explicit `null` (the "shop default" wire representation), and resends the value unchanged on PATCH submit. The spec exists to pin the contract that `taxClass` behaves like every other editable field rather than getting special-cased or dropped.

## Key elements

- **`deferred<T>()`** – Minimal promise helper that exposes `resolve` externally; used to control the locales-then-admin resolution order.
- **`lastPatch()`** – Scans `orvalMutator` mock calls (via `findLast`) for the entry whose `config.method === 'PATCH'` and returns that axios config; throws if no PATCH was sent.
- **`mountHydrated(adminTaxClass)`** – Mounts `ProductEdit` with deferred `/locales` and `GET /products/p1` responses, resolves them in the required order (locales first, then admin), flushes, and returns the wrapper.
- **`echo(body)`** – Spreads a caller-supplied body into a minimally valid admin-record shape so the post-PATCH reload has something to land on.
- **`LOCALES_RESPONSE`** – Static fixture for the `GET /locales` endpoint (single active locale `en`).
- **`describe('ProductEdit — taxClass round-trip')`** – Two cases: a product with `taxClass: 'reduced'` resends `'reduced'`; a product with no `taxClass` key resends `null`.

## Relationships

- **`src/modules/products/views/ProductEdit.vue`** – The SUT; mounted here with a memory router and the real module routes.
- **`src/infrastructure/http/index.ts`** – Source of `orvalMutator`; the spec replaces it with a stub so it can intercept outgoing HTTP calls and assert on the PATCH payload.
- **`tests/support/unit/orval-fixture-schema.ts`** – Provides `parseOrvalFixture` to build wire-valid payloads for `GET /locales`, `GET /products/p1`, and the PATCH echo.
- **`tests/support/unit/wire-modules.ts`** – Provides `wireModulesIntoCore()`, called at module top-level so `collectModuleRoutes(enabledModules)` can resolve real product routes for the memory router.

## Notes

- The locales-before-admin sequencing is intentional and mirrors `product-edit-locale-race.spec.ts`; the tab bar won't open if the admin record lands first.
- `lastPatch()` matches on uppercase `'PATCH'` because the generated Orval client sends methods uppercase, whereas `parseOrvalFixture`'s internal lookup is case-insensitive.
- The spec asserts `taxClass: null` (explicit key) rather than a missing key, reflecting the design that only `translations` receives a merge exception on this PATCH.
- The form always issues PATCH (never PUT) for this endpoint — see the inline comment referencing "Q10's answer."
