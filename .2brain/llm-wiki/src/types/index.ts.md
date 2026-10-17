---
source: src/types/index.ts
sha256: 386e25e7738f119acb300e10266d12e9e0e1fc537fe31db21cc66b78b9ae3250
generated_at: 2026-10-17T01:56:36.297208+00:00
model: ollama:qwen3.8:27b
---

# src/types/index.ts

## Purpose

Barrel module that aggregates the app's two codegen type surfaces (Orval REST client types and AsyncAPI feed types) behind a single import path, `@/types`, so consumers never reach into generated packages directly.

## Key elements

- **`export type * from '@api'`** — Re-exports the Orval-generated REST types as **type-only**. Intentionally excludes runtime exports (the client instance, enum constants) to prevent `.vue` files from importing them through this barrel and thereby bypassing the `@api` import ban in `eslint.config.ts`.
- **`export * from '../../contracts/asyncapi.generated'`** — Re-exports the AsyncAPI-generated channel/message types so they share the same `@/types` entry point.

## Relationships

- **`contracts/asyncapi.generated.ts`** — This file re-exports all of that module's contents. That file is committed codegen output (written by `npm run gen:asyncapi` from `asyncapi.yaml`); it is not source owned by this repo's app code. The REST-client counterpart (`@api`) is a separate generated package with the same "committed codegen, not owned source" status.

## Notes

- Nothing here is module-owned. View-only types that a single module owns (e.g. `realtime`, `webhooks`) belong in that module's own `types.ts`, not here.
- The one runtime enum a template legitimately needs is placed in `./enums.ts` (a sibling of this file) specifically so it can be imported without pulling in the full `@api` runtime surface.
- The paired backend uses the same AsyncAPI generator but a different input; queue-channel definitions live over there, not in the `asyncapi.generated.ts` this file re-exports.
