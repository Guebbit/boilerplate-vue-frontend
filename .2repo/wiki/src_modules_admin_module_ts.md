# src/modules/admin/module.ts

## Purpose

Module manifest for the **admin** domain. It assembles the domain's routes, navigation entry, response-schema registry, and locale loaders into a single object that satisfies the kernel's `AppModule` contract, so the admin console (service health, KPIs, audit log) can be registered and torn out as a unit.

## Key elements

- **`export default`** — An `AppModule`-shaped object (validated via `satisfies AppModule`) with:
  - `name: 'admin'` — the domain identifier used by the kernel registry.
  - `routes` — re-exported from `./routes`; the route table for the admin views.
  - `navigation` — a single nav entry ("Admin") with order `40`, section `'admin'`, icon `LayoutDashboard` (from `lucide-vue-next`), and an i18n label key.
  - `responseSchemas` — the `adminResponseSchemas` object from `./response-schemas`, used by the kernel for request/response validation.
  - `locales` — lazy loaders for `en` and `it` JSON dictionaries under `./locales/`.

## Relationships

- **`src/modules/admin/routes.ts`** — Its default export is consumed as the `routes` field of the manifest. The manifest is the sole integration point between the route table and the kernel registry.
- **`src/modules/admin/response-schemas.ts`** — Exports `adminResponseSchemas`, which the manifest forwards as the domain's `responseSchemas`. No other file in the domain wires these schemas into the kernel.
- **`@/kernel/registry`** (imported type) — Provides the `AppModule` type that constrains this file's default export at compile time.

## Notes

- The file is intentionally **dependency-light**: it imports only its two sibling files and the kernel type. No other domain store or service is touched.
- The JSDoc explicitly marks this module as the **first thing a downstream project deletes** if it has no ops dashboard, so changes to the `AppModule` shape in the kernel should keep backward-compatibility with this pattern in mind.
- `navigation` uses `plural: 1` — this is a required field on the nav-entry type but carries no visible logic here; treat it as a fixed convention across all domain manifests.
