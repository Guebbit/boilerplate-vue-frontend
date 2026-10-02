---
source: src/globals.d.ts
sha256: 45006b3512aaf244cccf79afa7013693d2ec7d94e77b69a386005c9096c2e90c
generated_at: 2026-10-02T11:52:39.270799+00:00
model: ollama:qwen3.8:27b
---

# src/globals.d.ts

## Purpose

Ambient type declarations for constants that Vite's `define` inlines as literals at build time. Because these identifiers never exist as real runtime variables, they can't be imported—each one must be declared here to satisfy the TypeScript compiler.

## Key elements

- **`__APP_VERSION__: string`** — The package's own version (from `package.json`), injected at build time. Used as the default `appVersion` tag in Faro telemetry (`src/infrastructure/observability/config.ts`).

## Relationships

No graph neighbors.

## Notes

- This is intentionally **not** a `VITE_*` environment variable. It must always reflect the actual built version and cannot be overridden by an operator-supplied env var.
- The declaration is purely for the type-checker; at runtime the identifier is replaced by the literal string during Vite's build step. There is no runtime import or module for it.
