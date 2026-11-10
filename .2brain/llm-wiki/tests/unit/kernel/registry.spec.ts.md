---
source: tests/unit/kernel/registry.spec.ts
sha256: 11258c2bbc9e08dc4532fe1f35afa7954aee40b5753719f5df151cd032259069
signature: 698ee5d77ecf32548e5915a6b55e07e20851ec0a84dd3992015d3c3d5474b8f6
generated_at: 2026-11-10T08:10:04.081771+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/registry.spec.ts

## Purpose

Unit tests for the module registry (`@/kernel/registry`), verifying that route deduplication, navigation ordering/grouping, and per-module aggregation (loading keys, tours, notices) behave correctly and fail loudly at build time rather than producing a blank page at runtime.

## Key elements

- **`makeRoute` / `makeModule` / `withNav` / `tourStep`** — local factories that produce minimal `RouteRecordRaw`, `AppModule`, and tour-step fixtures for the test cases.
- **`STUB_ICON`** — a one-off `{ template: '<svg />' }` object satisfying the required `AppNavigationEntry.icon` field without pulling in real icon components.
- **`collectModuleRoutes` suite** — asserts concatenation order and that duplicate route names throw.
- **`assertUniqueRoutes` suite** — asserts pass-through on unique routes, rejection on duplicate names, rejection on duplicate normalised paths (e.g. `cart` vs `/cart/`), and sibling-path collision detection for nested routes.
- **`collectModuleNavigation` suite** — asserts flattening, skipping modules with no navigation, and returning `[]` for an empty module list.
- **`sortNavigation` suite** — asserts `order`-based ranking, unranked entries sorted last, and non-mutation of the input array.
- **`groupNavigation` suite** — asserts section bucketing (default → `main`), that all three sections (`main`, `account`, `admin`) are always present (even empty), per-section ordering, and non-mutation.
- **`collectModuleLoadingKeys` suite** — asserts flattening of opt-in `loadingKeys` prefixes and skipping modules without them.
- **`collectModuleTours` suite** — asserts concatenation of tour steps and empty-array return for no modules.
- **`collectModuleNotices` suite** — asserts merging by code key, rejection of duplicate notice codes (naming the offender), and empty-object return for no modules.

## Relationships

Imports every public function and the `AppModule` / `AppNavigationEntry` types from `@/kernel/registry` (the module under test) and the `RouteRecordRaw` type from `vue-router`. No other files are referenced.

## Notes

- The file header states it mirrors `tests/unit/kernel/registry.test.ts` from a backend boilerplate — same cases and field names, different runtime. Keep the two in sync when adding or changing cases.
- `groupNavigation` always returns keys `main`, `account`, and `admin` even when empty; consumers can index without a guard.
- `sortNavigation` and `groupNavigation` are both tested for non-mutation — if a refactor introduces in-place sorting, both tests will catch it.
- `assertUniqueRoutes` compares **normalised** paths (trailing slashes stripped), so `cart` and `/cart/` are treated as the same route.
- The `order` field on `AppNavigationEntry` is optional; entries lacking it are ranked after all ranked entries.
