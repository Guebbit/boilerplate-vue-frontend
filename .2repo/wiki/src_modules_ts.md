# src/modules.ts

## Purpose
The build-level registry of domain modules. It is the single place that declares which `src/modules/<name>/` folders are active in this build, and exports them as an ordered array consumed by the kernel's route-splicing logic. Adding or removing a domain is intentionally a one-line change here plus a folder on disk—no code generation or indirection.

## Key elements
- **`enabledModules: AppModule[]`** — the sole export. An alphabetically-ordered array of imported module objects (`account`, `admin`, `cart`, `delivery`, `demo`, `feedback`, `inventory`, `locales`, `orders`, `payments`, `products`, `realtime`, `users`, `wishlist`). Each element is a default export from `@/modules/<name>/module` typed as `AppModule` from `@/kernel/registry`. The array order is the order in which each module's route records are spliced into the router tree (order is semantically irrelevant for distinct paths, per the file's doc comment).
- **Per-module imports** — one `import <name> from '@/modules/<name>/module'` per domain. Each module is expected to default-export an `AppModule` object.

## Relationships
- **`openapi.yaml`** — The domain modules listed here (account, cart, orders, payments, inventory, etc.) correspond to the API domains whose contracts are defined in the OpenAPI spec. The registry is the front-end counterpart: each module in `enabledModules` is the client-side wiring for one API domain in the spec.

## Notes
- **Alphabetical order is a convention, not a requirement.** The file's comment states that vue-router's own ranking makes splice order irrelevant for distinct paths; alphabetical ordering is kept purely so diffs stay minimal.
- **No conditional or environment-based filtering.** Every module in the file is unconditionally included; "disabling" a domain means deleting its import line and its folder. The file's comment frames any resulting breakage as a real coupling worth surfacing rather than a problem to hide.
- **`demo` and `realtime` are present alongside production domains.** They are not behind a flag in this file—remove them from the array if they should not ship.
