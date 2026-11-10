---
source: src/modules/observability/module.ts
sha256: 5cf017c986e90b76efbf9621d33901f276a5d4ad9a5913d1c3e34e6e53620d27
signature: 5cf017c986e90b76efbf9621d33901f276a5d4ad9a5913d1c3e34e6e53620d27
generated_at: 2026-11-10T04:52:13.527097+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/module.ts

## Purpose

Module manifest that registers the observability domain with the application kernel. It declares the module's routes, navigation entries, response-schema validators, and locale loaders so the kernel's registry can wire them in. It is intentionally the only file in the domain that imports from the kernel, keeping the rest of the module self-contained and trivially removable.

## Key elements

- **Default export** – an object satisfying `AppModule` with:
  - `name: 'observability'` – the module's registry key.
  - `routes` – imported from `./routes.ts`; the module's route table.
  - `navigation` – three entries, all in the `admin` section, each gated by a different audience:
    - `RealtimePlayground` (order 30, `Radio` icon) – SSE playground over the metrics stream; platform `operator`-only.
    - `Admin` (order 40, `LayoutDashboard` icon) – ops console (service health, KPIs, audit log); platform `operator`-only.
    - `AuditLog` (order 41, `ScrollText` icon) – shop-level audit trail; visible to `manager`/`support`/`moderator`/`admin` via the `read:AuditLog` permission.
  - `responseSchemas` – lazy `import()` of `./response-schemas` returning `adminResponseSchemas`.
  - `locales` – lazy `import()` of `./locales/en.json` and `./locales/it.json`, each passed through `dictionary` from the kernel registry.
- **Icon imports** – `LayoutDashboard`, `Radio`, `ScrollText` from `lucide-vue-next`, used solely for the nav entries above.

## Relationships

- **`src/modules/observability/routes.ts`** – imported as `routes` and placed directly into the `AppModule` manifest. This is the only file-level dependency of this module within the codebase; everything else (icons, kernel types, locale files, schema file) comes from external packages or sibling files that are never imported by any other domain.

## Notes

- The module is deliberately **dependency-free** with respect to other domain stores: it reads observability endpoints directly. Dropping the module from the app has zero side effects on the rest of the system — this is a stated design goal so downstream projects can delete it cleanly.
- The three nav entries exist as separate items (rather than one grouped screen) because each has a different `canAccess` audience; the kernel's nav renderer filters them independently.
- `responseSchemas` and `locales` are **lazy** (dynamic `import()`), so they are not loaded at app startup unless the kernel explicitly requests them.
- The doc comment references `docs/modules/observability.md` § "The map" for a broader context map of the subdomain.
