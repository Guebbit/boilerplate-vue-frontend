---
source: scripts/demo/demo-module-names.ts
sha256: 711d580663b9f2b42d91a539f698e75d2cbdbdd06062e4f6e4c30878a03413b5
generated_at: 2026-10-02T11:30:14.765639+00:00
model: ollama:qwen3.8:27b
---

# scripts/demo/demo-module-names.ts

## Purpose

Provides a single shared way for the two `scripts/demo/` scripts to obtain the list of names from `DEMO_MODULE_NAMES` in `src/demo-modules.ts`. It reads the value out of the source **text** (via regex) instead of a live `import`, because `scripts/**` and `src/**` belong to separate TypeScript project references and a cross-project import would break `vue-tsc --build` (TS6307).

## Key elements

- **`readDemoModuleNames(repoRoot: string): string[]`** — Reads `src/demo-modules.ts` from disk, extracts the `DEMO_MODULE_NAMES = [ … ]` array with a regex, and returns the quoted string names. Throws if the expected array literal shape is not found.

## Relationships

- **`scripts/demo/demo-remove.ts`** — Consumes `readDemoModuleNames` to know which demo module entries to remove.
- **`scripts/demo/measure-demo-strip.ts`** — Consumes `readDemoModuleNames` to know which demo module entries to measure/strip.

## Notes

- The regex `/DEMO_MODULE_NAMES = \[([^\]]*)]/` is brittle by design: it expects a single-line array literal. If `src/demo-modules.ts` reformats the array onto multiple lines or changes the `=` to `const … = …`, this reader will throw.
- `src/demo-modules.ts` itself remains a normal, importable module; its **other** reader (`tests/unit/demo-modules.spec.ts`) lives under `tsconfig.vitest.json`, which includes `src/**`, so it can use a regular `import` without hitting the TS6307 issue.
- File names inside the array must match `[\w-]+` (word characters and hyphens); any other pattern will silently be skipped by the extraction regex.
