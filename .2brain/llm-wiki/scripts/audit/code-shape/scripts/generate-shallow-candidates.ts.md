---
source: scripts/audit/code-shape/scripts/generate-shallow-candidates.ts
sha256: 93b5fed95fc5498f16ccb94a76282400c9c8682a23c72ae4ad0959361cc89c73
signature: 7f009c61e0aeecf06ad5f2d03e5fea1b1bd604e2fe1d4fa0f25b207a341a1dda
generated_at: 2026-11-10T02:18:56.745949+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/code-shape/scripts/generate-shallow-candidates.ts

## Purpose

CLI entry point for the `code-shape` audit's shallow-candidate report. It builds a full TypeScript program over the app, its Vitest project, and every `.vue` SFC (treated as a virtual `.vue.ts` source), then hands that program to `findShallowCandidates` and writes the resulting JSON to `reports/audit/code-shape/shallow.json`.

## Key elements

- **`scriptOf(text, file)`** – Parses an SFC with `vue/compiler-sfc`, places each `<script>` / `<script setup>` block on its original line numbers (blanking everything else), and appends `void [identifiers…]` so template-referenced names count as a use.
- **`virtualFiles`** – Module-level `Map<string, string>`: absolute path `…​.vue.ts` → virtual TS source, populated at load time via `globSync('src/**/*.vue')`.
- **`readConfig(name)`** – Reads and parses a tsconfig file into `ts.ParsedCommandLine`.
- **`app` / `tests`** – Parsed `tsconfig.app.json` and `tsconfig.vitest.json`; their file lists are unioned as root names.
- **`host`** – Created by `ts.createCompilerHost(app.options)`, then patched so `readFile`, `fileExists`, `getSourceFile`, and `resolveModuleNameLiterals` serve the virtual `.vue.ts` sources and resolve `@/…​.vue` / relative `.vue` imports to them.
- **`program`** – Created by `ts.createProgram` from the combined root names, `app.options`, and the custom host.
- **`scope`** – CLI args (`process.argv.slice(2)`) or the default `['src']`.
- **Main flow** – Calls `findShallowCandidates(program, ROOT, scope)`, ensures the output directory exists, writes the JSON report, and logs a one-line summary.

## Relationships

- **`scripts/audit/code-shape/scripts/shallow-candidates.ts`** — Provides `findShallowCandidates`, the core counting logic. This file is the thin CLI wrapper: it assembles the TypeScript program and delegates all candidate detection to that module. The split is deliberate so the unit test can import the counting without executing this script's side-effects (glob, file I/O, program creation).

## Notes

- `virtualFiles` is built at **module top-level** (not inside a function), so the glob and SFC parsing happen once at import/execution time.
- Template identifier extraction is a regex (`\b[$A-Z_a-z][\w$]*\b`) over the raw template content, not a full SFC template AST parse.
- The `void […]` suffix makes TypeScript count template-only references as "one use," which feeds the `smallAndRare` heuristic downstream.
- Output directory (`reports/audit/code-shape/`) is created with `mkdirSync({ recursive: true })` each run; the report file itself is gitignored.
- Run via `npm run audit:shallow -- [path…]`; paths are repo-relative prefixes (default `src`).
