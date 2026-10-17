---
source: tests/unit/kernel/registry.spec.ts
sha256: 6a8a0a6d1e9a5297962706badd3592d200a9ca8abb3c2f691563e6ad35032aaa
generated_at: 2026-10-17T02:40:55.762928+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/registry.spec.ts

## Purpose

Vitest unit tests for the `@/kernel/registry` module. They verify that route collection, uniqueness enforcement, navigation aggregation/sorting/grouping, and loading-key collection all behave correctly and fail loudly on misconfiguration — the stated philosophy being that a startup error naming the offending path is strictly preferable to a silent blank page.

## Key elements

- **`makeRoute(name)`** – helper returning a minimal `RouteRecordRaw` with a dummy template component.
- **`makeModule(name)`** – helper returning an `AppModule` with a single same-named route.
- **`withNav(name, navigation)`** – like `makeModule` but also attaches navigation entries.
- **`STUB_ICON`** – placeholder object for the required `AppNavigationEntry.icon` field.
- **`describe('collectModuleRoutes')`** – verifies concatenation order and that duplicate route names throw with a specific message.
- **`describe('assertUniqueRoutes')`** – covers name-uniqueness, normalised-path uniqueness (trailing-slash insensitive), and nested-route resolution against ancestors and siblings by full path.
- **`describe('collectModuleNavigation')`** – verifies concatenation, that modules with no navigation are skipped (no hole), and that an empty module list yields `[]`.
- **`describe('sortNavigation')`** – verifies `order`-based ranking, unranked entries sink to the end, and the input array is not mutated.
- **`describe('groupNavigation')`** – verifies section bucketing (default section `main`), that all known sections are always present (even empty), intra-section ordering, and non-mutation of the input.
- **`describe('collectModuleLoadingKeys')`** – verifies flattening of `loadingKeys` arrays across opted-in modules while skipping modules that don't declare them.

## Relationships

No graph neighbors are listed. The sole production dependency is `@/kernel/registry` (imported for the functions under test and the `AppModule`/`AppNavigationEntry` types).

## Notes

- The file header comments state it **mirrors** `tests/unit/kernel/registry.test.ts` in a backend boilerplate: same cases, same field names, different runtime.
- `groupNavigation` **always** returns all three sections (`main`, `account`, `admin`) as keys, even when empty, so consumers can index without an existence guard.
- `sortNavigation` and `groupNavigation` are both explicitly tested to be **non-mutating** — they return new arrays.
- Path normalisation in `assertUniqueRoutes` treats `/cart/` and `cart` as the same path (trailing-slash insensitive), but the error message reports the normalised form.
- Unranked navigation entries (no `order` field) are not an error; they are simply sorted last.
