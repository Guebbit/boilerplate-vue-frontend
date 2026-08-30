# tests/unit/kernel/registry.spec.ts

## Purpose
Unit tests for the four public helpers exported from `@/kernel/registry` (`collectModuleRoutes`, `collectModuleNavigation`, `sortNavigation`, `groupNavigation`). They pin down the exact contract of how a multi-module app assembles its route table and sidebar navigation, ensuring that misconfigurations fail loudly at boot rather than producing a blank page at runtime.

## Key elements
- **`makeRoute` / `makeModule` / `withNav`** – small factory helpers that build minimal `RouteRecordRaw` and `AppModule` fixtures so each `it` block stays readable.
- **`describe('collectModuleRoutes')`** – verifies the function flattens all module route arrays into a single ordered list.
- **`describe('collectModuleNavigation')`** – covers three cases: normal concatenation, a module that declares no navigation entries (must not create a "hole"), and an empty module list (the "event-portal" end-state).
- **`describe('sortNavigation')`** – confirms ranking by the `order` field (ignoring registration order), that entries missing `order` sink to the end, and that the input array is not mutated.
- **`describe('groupNavigation')`** – confirms bucketing by `section` (defaulting to `'main'`), that all three section keys (`main`, `account`, `admin`) are always present even when empty, per-section sorting by `order`, and non-mutation of the argument.

## Relationships
No graph neighbors are recorded. The file imports from `@/kernel/registry` (the system under test) and from `vue-router` / `vitest` for types and the test runner, but neither is listed as a tracked neighbor.

## Notes
- The header comment states this file intentionally mirrors `tests/unit/kernel/registry.test.ts` in a separate backend boilerplate repo — "same cases, same field names, different runtime." Keep the two in sync when adding cases.
- `groupNavigation` always returns all three section keys (`main`, `account`, `admin`), even as empty arrays. Consumers can index freely without a `null`/`undefined` guard; do not relax this in the implementation.
- Both `sortNavigation` and `groupNavigation` are tested for **non-mutation** of their input array. If the implementation ever switches from a copy-on-write to an in-place sort, those tests will catch it.
