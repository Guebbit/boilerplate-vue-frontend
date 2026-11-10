---
source: knip.config.ts
sha256: e1f6adc5e2d01ae039c740a152b52ff4df567a1f0700f108837dad642c21277a
signature: 0b4a36851189389b66def9b4df1e6c753b38f20d2b52d5e4820f40058ab20444
generated_at: 2026-11-10T02:17:00.787718+00:00
model: ollama:qwen3.8:27b
---

# knip.config.ts

## Purpose

Configuration for [knip](https://knip.dev), a tool that lists unused files, exports, and dependencies by walking imports from entry points. This file supplements what knip's built-in plugins already discover (from `package.json`, Vite, ESLint) by declaring entry points and ignore patterns that no plugin can infer. It is consumed by the `code-shape` audit process, not by any gate.

## Key elements

- **`entry`** — Array of glob patterns and explicit file paths that knip should treat as import roots. Covers module barrels (`src/modules/*/index.ts`), module manifests (`src/modules/*/module.ts`), test/spec files, scripts, VitePress config/theme, mutation testing config, and Lighthouse budget files.
- **`ignore`** — Array of globs telling knip to skip generated or contract code (`contracts/**`, `src/**/*.generated.ts`).
- **Default export** — The `KnipConfig` object itself.

## Relationships

No graph neighbors.

## Notes

- This file is **advisory, not authoritative**: the doc comment states that everything knip reports is a *candidate* for the `code-shape` audit to judge, not a verdict. It is never read directly by a gate.
- Module barrels are marked as entry points explicitly because they are intentionally unused as re-exports (`docs/theory/strategic-ddd.md` §5); without this, knip would flag them.
- `module.ts` manifests are loaded via a registry glob at runtime and are never imported by name, so no static analysis tool discovers them.
- VitePress paths (`docs/.vitepress/config.mts`, `docs/.vitepress/theme/index.ts`) are listed because no knip plugin reads VitePress's conventional structure.
- The Lighthouse budget files (`src/modules/*/tests/lighthouse.ts`) are loaded by a runtime runner, not imported statically.
