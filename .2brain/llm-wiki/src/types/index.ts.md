---
source: src/types/index.ts
sha256: 386e25e7738f119acb300e10266d12e9e0e1fc537fe31db21cc66b78b9ae3250
signature: 386e25e7738f119acb300e10266d12e9e0e1fc537fe31db21cc66b78b9ae3250
generated_at: 2026-11-10T06:22:46.381131+00:00
model: ollama:qwen3.8:27b
---

# src/types/index.ts

## Purpose

Barrel file that re-exports two sets of generated types (Orval REST client types and AsyncAPI feed types) behind a single import path, `@/types`. It exists so consumers never reach into the generated packages or contract files directly. It owns no types of its own; module-owned view types (e.g. `realtime`, `webhooks`) deliberately live in their owning module's `types.ts` instead.

## Key elements

- **`export type * from '@api'`** — Type-only re-export of the Orval-generated REST types. The `type` keyword is load-bearing: `@api` also ships a runtime client and enum constants, and a value import through this barrel would bypass the `@api` import ban that `eslint.config.ts` enforces on `.vue` components.
- **`export * from '../../contracts/asyncapi.generated'`** — Full re-export of the generated AsyncAPI channel/message types so consumers import from `@/types` rather than from the contract path.

## Relationships

- **`contracts/asyncapi.generated.ts`** — Directly re-exported (value-level `export *`). Both this file and the REST client output are committed codegen artifacts (regenerated via `npm run gen:asyncapi`), not hand-written source this module owns. The queue-channel definitions remain on the paired backend's side.

## Notes

- The single runtime enum a template legitimately needs is **not** re-exported here; it lives in `./enums.ts`. Importing runtime values through this barrel is a lint violation in component code.
- Both generated files (`@api`, `contracts/asyncapi.generated.ts`) are committed codegen output, not hand-written source. Treat them as read-only; regenerate rather than edit.
- This file is a pure re-export surface — there are no original type declarations, functions, or classes in it.
