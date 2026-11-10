---
source: scripts/contracts/shared-rules/generate-spec.ts
sha256: 4ff87f0c1d3568f6f9c9d73f568337c82f5f961a3a6b569971451c8878b02d2e
signature: 224bb4f603bf9d33cda4f8e1757080e2eb32bccc4ed4bc38d3d584e50fc8c084
generated_at: 2026-11-10T02:26:47.051378+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/shared-rules/generate-spec.ts

## Purpose

Pure type module that defines the **spec** a rules file uses to declare how it should be compiled into a committed `as const` TypeScript file. It is consumed at build time by `generate-shared-rules.ts` (and its renderer), never at runtime. Keeping these shapes in a dedicated file ensures the frontend and backend generators read the same rule contract.

## Key elements

- **`GenerateShape`** — union type `'verbatim' | 'keyed-list'`; selects how a top-level rules field is serialized into the output file.
- **`GeneratedExport`** — describes one exported constant in the generated file: its name, serialization shape, optional source `field` (absent = whole document), and docblock text.
- **`GenerateSpec`** — the top-level spec: a repo-relative `out` path and an ordered `exports` array of `GeneratedExport`.
- **`KeyedEntry`** — a single entry in a `keyed-list` field: the wire `value` string (from which the constant key is derived) and a per-key `description`.

## Relationships

- **`scripts/contracts/shared-rules/rules.ts`** — the rules-file format that embeds a `GenerateSpec`; `generate-spec.ts` supplies the types that `rules.ts` references.
- **`scripts/contracts/shared-rules/render.ts`** — the renderer that walks a `GenerateSpec` and emits the committed TypeScript output; it imports the types defined here.
- **`tests/unit/scripts/contracts/shared-rules-render.spec.ts`** — unit tests that exercise the render path, implicitly validating these type shapes.

## Notes

- No imports, no runtime code — this file is a type-only module (`export type` / `export interface`).
- `GeneratedExport.field` is optional; when omitted the *entire* parsed rules document is the source for that export, not a single sub-field.
- For `keyed-list` shape the key name is **derived** from the `value` string at render time; the spec itself only stores the raw string.
- The `out` path is repo-relative, not absolute.
