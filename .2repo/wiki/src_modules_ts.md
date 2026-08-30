# src/modules.ts

## Purpose

Central registry that declares which domain modules are included in this build. Adding or removing a domain is a one-line change here (plus the corresponding folder), making the set of active modules the single source of truth the rest of the app boots from.

## Key elements

- **`enabledModules: AppModule[]`** — the sole export. An alphabetically ordered array of the 14 active domain modules (account, admin, cart, delivery, demo, feedback, inventory, locales, orders, payments, products, realtime, users, wishlist). Each entry is the default export of `src/modules/<name>/module`.
- **`AppModule` type** (imported from `@/kernel/registry`) — the contract every domain module must satisfy to be listed here.

## Relationships

- **`src/kernel/registry.ts`** — provides the `AppModule` type that constrains every entry in `enabledModules`.
- **`src/main.ts`** — application entry point; consumes `enabledModules` to bootstrap the module tree and router.
- **`src/modules/demo/*`** (`guards.ts`, `store.ts`, `views/Playground.vue`) — internal pieces of the `demo` domain; this file only references the module's barrel (`@/modules/demo/module`), not the sub-files directly.
- **`docs/theory/domain-layer.md`** — conceptual documentation for the domain-module pattern this file instantiates.

## Notes

- The array order is kept alphabetical purely for stable diffs. The comment in the file clarifies that vue-router's own ranking makes splice order irrelevant for distinct paths, so do not reorder to "fix" routing.
- The file's own docblock treats a broken import after a domain removal as *intentional* coupling signal — do not add shims or feature-flag wrappers to paper over it.
- There is no conditional logic, no environment check, no dynamic import. Presence in the array is the only gate.
