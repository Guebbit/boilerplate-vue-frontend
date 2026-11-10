---
source: src/modules/payments/module.ts
sha256: 258e69f8e36e58aa81fc340eb3ed7a948759e89e125c71767a4e3f7a784beb3b
signature: 258e69f8e36e58aa81fc340eb3ed7a948759e89e125c71767a4e3f7a784beb3b
generated_at: 2026-11-10T05:12:16.330606+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/module.ts

## Purpose

Module manifest for the payments subdomain. It registers the staff payments page with the app registry, supplying the navigation entry, route table, response schemas, and locale loaders that the kernel needs to wire the panel into the admin UI.

## Key elements

- **Default export (`AppModule`)** – The manifest object satisfying the `AppModule` contract from `@/kernel/registry`. Declares `name: 'payments'`, `loadingKeys: ['payments']`, and the `satisfies AppModule` type assertion.
- **`routes`** – Imported from `./routes` and attached to the manifest so the kernel can register the page's URL paths.
- **`navigation`** – A single entry (`PaymentsList`) that places a link under the admin → Sales group (order 56, `Landmark` icon). Its `badge` callback calls `useWorkCount('salesPayments')` to surface a pending-payments count.
- **`responseSchemas`** – Lazy import of `./response-schemas`, returning `paymentsResponseSchemas` for runtime API validation.
- **`locales`** – Lazy imports of `en.json` and `it.json`, each piped through `dictionary` from `@/kernel/registry` before being handed to the i18n layer.

## Relationships

- **→ `src/modules/payments/routes.ts`** – Static import; the route definitions are forwarded directly into the manifest's `routes` field. This is the only file-level dependency the kernel resolves for this module's URL registration.

## Notes

- The module deliberately imports **nothing** from the orders module. The dependency arrow is orders → payments (orders mounts the `PaymentPanel`), keeping this module deletable as a unit (`rm -rf` the folder + remove the registry line).
- Classified as a **supporting** subdomain: no business-logic differentiator; it only provides the panel and the staff list page.
- Context map lives in `docs/modules/payments.md` § "The map".
- The `badge` function is not a static value; it's a thunks-style callback the navigation renderer calls to resolve the work-count badge at render time.
