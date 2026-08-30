# src/types/api.ts

## Purpose

Single-line barrel that re-exports all generated Orval API types from the `@api` package. It exists so that consumers import types from `@/types` (via the directory barrel) rather than reaching into the generated package directly, keeping the public import surface stable even if the generated package's location or alias changes.

## Key elements

- **`export * from '@api'`** — Wildcard re-export of every symbol in the `@api` alias (the Orval-generated OpenAPI types package). No local definitions, filters, or renames.

## Relationships

- **`src/types/index.ts`** — The directory barrel that re-exports this file, making all `@api` symbols reachable as `@/types`. This file is the bridge between the generated package and the application's public type namespace.
- **`src/types/asyncapi.generated.ts`** — Sibling in the same `types/` directory; both are surfaced through `index.ts`, but this file has no direct import or type reference to it.

## Notes

- The `@api` alias is a path alias (likely in `tsconfig` / bundler config) pointing to a **generated** Orval output. Do not edit the target by hand; regenerate instead.
- The JSDoc `@module` tag marks this as a side-effect-free barrel; it carries no runtime code.
- Because the export is a wildcard (`export *`), there is no API-level filtering or renaming—adding or removing types in the generated package flows straight through to consumers.
