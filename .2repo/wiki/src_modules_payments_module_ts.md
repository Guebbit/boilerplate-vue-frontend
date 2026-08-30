# src/modules/payments/module.ts

## Purpose

Declares the payments module manifest for the app registry. It registers the response schemas and locale loaders needed to wire the `PaymentPanel` into the application. The module intentionally owns no routes — paying is a sub-interaction on an order, mounted by the orders module, not a standalone page.

## Key elements

- **Default export** — An object satisfying `AppModule` (from `@/kernel/registry`) with:
  - `name: 'payments'`
  - `routes: []` — empty by design; the panel is mounted by orders, not navigated to.
  - `responseSchemas` — re-exports `paymentsResponseSchemas` from `./response-schemas`.
  - `locales` — Lazy dynamic imports of `./locales/en.json` and `./locales/it.json`, each returning the default export as a dictionary.
- **`paymentsResponseSchemas`** (import) — The schema definitions consumed by the app registry for payload validation/rendering of payment responses.

## Relationships

- **`src/modules/payments/response-schemas.ts`** — Provides `paymentsResponseSchemas`, which this module re-exports as its `responseSchemas` field. This is the sole cross-file dependency in the module manifest.

## Notes

- The dependency direction is **orders → payments**, not the reverse. The orders module is the one that mounts `PaymentPanel`; payments contributes no navigation. Deleting this module and its registry entry removes the pay flow entirely.
- The `locales` loaders use dynamic `import()` + `.then()` rather than static imports, so locale files are code-split and loaded on demand.
- The JSDoc explicitly states that the payment provider is the API's concern, not the frontend module's — this module only exposes the panel and its schemas.
