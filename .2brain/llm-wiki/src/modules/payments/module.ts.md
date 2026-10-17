---
source: src/modules/payments/module.ts
sha256: d8e8b1c1665ed28860d1e58999d29ee1e9de86f5f0d15be4fc99b980ba257c99
generated_at: 2026-10-17T01:23:32.337541+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/module.ts

## Purpose
Declares the payments `AppModule` manifest for the app registry: it wires in the staff payments route, a single admin navigation entry, lazy-loaded response schemas, and English/Italian locale dictionaries so the panel can be mounted by the rest of the application.

## Key elements
- **Default export (`AppModule`)** — Object named `'payments'` that satisfies the `AppModule` type from `@/kernel/registry`.
- **`routes`** — Imported from `./routes` and attached to the manifest; consumed by the router/registry.
- **`navigation`** — Single entry: `PaymentsList` under section `admin`, group `navigation.group-sales`, order 56, icon `Landmark`.
- **`responseSchemas`** — Lazy import of `./response-schemas`, returning `paymentsResponseSchemas`.
- **`locales`** — Lazy imports of `en.json` / `it.json`, each piped through `dictionary` (from `@/kernel/registry`) before resolution.
- **`loadingKeys: ['payments']`** — Key the registry uses to track locale-load state.

## Relationships
- **`src/modules/payments/routes.ts`** — Imported directly and assigned to the `routes` field; defines the page's URL and component mapping.
- **`@/kernel/registry`** — Provides the `AppModule` type (used via `satisfies`) and the `dictionary` helper applied to each locale JSON.
- The docblock notes a *structural* (not import) relationship with the **orders** module: orders mounts the `PaymentPanel` exported by this module's barrel, and fills the `payments-awaiting-transfer` slot that this module's staff page reads. No direct import between the two files.

## Notes
- Uses `satisfies AppModule` rather than a type annotation, preserving literal types on `name`, `order`, etc. while still type-checking the shape.
- The module is designed to be deletable in one shot: removing it plus its registry line takes out the panel, the pay flow, and the staff page simultaneously (as stated in the docblock).
- Locale loaders are *not* plain JSON imports; they are wrapped in a `dictionary` call so the registry can normalise keys at load time.
