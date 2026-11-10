---
source: src/modules/example/domain/index.ts
sha256: aba8663df474a875313285ac736f0d0ff1491b6b8c669d96dde7f27526c835a7
signature: aba8663df474a875313285ac736f0d0ff1491b6b8c669d96dde7f27526c835a7
generated_at: 2026-11-10T04:22:06.335144+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/domain/index.ts

## Purpose

Barrel file for the `example` module's domain layer. It re-exports the module's pure rules (currently just `publicationOf`) so that screens and tests import from one stable entry point rather than reaching into individual rule files. The `domain/` folder exists because the publication rule met the project's threshold (2+ callers or a known trap).

## Key elements

- **`publicationOf`** (re-exported from `./publication`) — the single reading rule in this module.
- **`Publication`** (type re-export) — domain type describing a publication entity.
- **`PublicationState`** (type re-export) — domain type describing the state of a publication.

## Relationships

- **`src/modules/example/domain/publication.ts`** — sole upstream dependency; all exports here originate there.
- **`src/modules/example/views/ExampleTarget.vue`** — downstream consumer that imports `publicationOf` and/or the types through this barrel.
- **`src/modules/example/views/ExamplesList.vue`** — downstream consumer that imports `publicationOf` and/or the types through this barrel.
- **`src/modules/example/tests/publication.spec.ts`** — exercises `publicationOf`; may import via this barrel or directly from `publication.ts`.

## Notes

- Adding a new domain rule means appending an `export { … } from './<rule>'` line here — screens should not import rule files directly.
- The JSDoc points to `docs/theory/domain-layer.md` for the rationale behind the barrel pattern and the "clear the floor" creation rule.
