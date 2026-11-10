---
source: src/vite-env.d.ts
sha256: e72e9bdf9af0b5fadecb86ea4771f2cb88477d79766200c02f2e2e9ffd59275f
signature: 67698b94409b597fa10f8f802e96ad3ae25cb8658746d167c22e98672b931979
generated_at: 2026-11-10T06:34:34.317314+00:00
model: ollama:qwen3.8:27b
---

# src/vite-env.d.ts

## Purpose

Ambient type declaration that makes `import.meta.env.VITE_*` reads type-safe. By declaring every key the app actually uses and enabling `strictImportMetaEnv`, any read of a key *not* listed here becomes a compile error instead of silently resolving to `any`.

## Key elements

- **`ViteTypeOptions`** — Ambient interface setting `strictImportMetaEnv: unknown`. This is Vite's opt-in flag that turns off the default `Record<string, any>` fallback for undeclared env keys.
- **`ImportMetaEnv`** (interface extension, not replacement) — Declares 24 readonly optional string properties, each a `VITE_*` env var the app reads. Vite's built-in `BASE_URL`, `MODE`, `DEV`, `PROD`, `SSR` come from Vite's own ambient types and are *not* redeclared here.

## Relationships

No graph neighbors. This is a pure ambient declaration file with no imports or exports; it is picked up by the TypeScript compiler as a global type extension rather than being referenced by any module in the dependency graph.

## Notes

- **Declaration merge, not override.** The `ImportMetaEnv` here *extends* Vite's built-in interface. Renaming it breaks the merge and all env typing silently disappears.
- **All keys are optional (`?`).** Vite only ever injects `string` values; an unset `.env` entry is `undefined` at runtime. Every consumer is expected to chain a fallback (`??`, `||`) at the read site.
- **`.env-example` is the source of truth** for what each key means and its default. This file states types only — do not add documentation comments for individual keys here.
- **Eslint suppressions are load-bearing.** The `unicorn/prevent-abbreviations` disables are there because the interface names (`ViteTypeOptions`, `ImportMetaEnv`) are fixed by Vite's augmentation contract; renaming them breaks compilation.
- Adding a new `VITE_*` env var means adding its key here *and* to `.env-example`, or the next developer who reads it gets a compile error (intended behavior).
