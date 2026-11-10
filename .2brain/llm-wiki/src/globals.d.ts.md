---
source: src/globals.d.ts
sha256: 45006b3512aaf244cccf79afa7013693d2ec7d94e77b69a386005c9096c2e90c
signature: 45006b3512aaf244cccf79afa7013693d2ec7d94e77b69a386005c9096c2e90c
generated_at: 2026-11-10T03:00:08.405937+00:00
model: ollama:qwen3.8:27b
---

# src/globals.d.ts

## Purpose

Ambient TypeScript declarations for constants that Vite's `define` option replaces with a literal at build time. Because these identifiers never exist at runtime, they must be declared globally here rather than imported.

## Key elements

- **`__APP_VERSION__: string`** — The package's own version (sourced from `package.json` at build time). Consumed by the Faro `appVersion` telemetry tag in `src/infrastructure/observability/config.ts`. Deliberately *not* a `VITE_*` environment variable so an operator cannot accidentally override it with a mismatched value.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Vite `define` substitutes the identifier with a string literal during bundling; the `declare const` exists purely to satisfy the TypeScript compiler. Do not import this file.
- The name intentionally avoids the `VITE_` prefix. Treat it as a build-time constant, not a configurable environment variable.
