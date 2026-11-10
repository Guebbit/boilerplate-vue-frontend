---
source: scripts/tailwind-build.ts
sha256: a6cfba79a8f8b8f07c7dd74cbe972c771e4c634f80c2aaad40ab1e2e43b01578
signature: bbdd9f3429748f31524703b4d2aa1c978222f2c81a9dc747405e64f67d54a2dd
generated_at: 2026-11-10T02:47:27.055144+00:00
model: ollama:qwen3.8:27b
---

# scripts/tailwind-build.ts

## Purpose

Provides a lightweight, Vite-free way to compile the project's entry stylesheet (`src/styles/main.css`) with Tailwind v4's `compile()` API and generate CSS for an arbitrary list of candidate class names. Exists so that scripts and tests can query "what CSS does Tailwind produce for these classes?" without spinning up a full build pipeline.

## Key elements

- **`tailwindBuilder`** (exported, async) — Compiles `main.css` once and returns a synchronous function `(candidates: string[]) => string`. The returned function calls the internal `compiler.build(candidates)` to produce the CSS Tailwind would emit for those class names. Unknown candidates yield no output.
- **`requireFromRoot`** (module-private) — A `createRequire` instance anchored at `<ROOT>/package.json`, used to resolve `@import` targets (e.g. `tailwindcss/utilities.css`) from the repo's `node_modules`, mimicking Vite's resolution.
- **`loadStylesheet` callback** — Passed to `compile()`; resolves an import id relative to the current base, reads the file, and returns its path, base, and content.

## Relationships

- **`scripts/css-sources.ts`** — Supplies the `ROOT` and `MAIN_CSS` constants that locate the project root and the entry stylesheet. Direct import.
- **`scripts/audit/css-invasive/scan.ts`** — Consumes `tailwindBuilder` to generate CSS for candidate classes during invasive-CSS auditing.
- **`tests/cross-cutting/utility-collisions.spec.ts`** — Uses `tailwindBuilder` to check whether specific utility class combinations produce conflicting rules.
- **`tests/support/e2e/layout-checks.ts`** — Uses `tailwindBuilder` as a helper to assert expected CSS output in layout-related tests.

## Notes

- The compiler is created **once** per `tailwindBuilder()` call; the returned inner function is synchronous and cheap to invoke repeatedly. Callers should store the promise result rather than calling `tailwindBuilder()` in a loop.
- Resolution relies on `createRequire` at the repo root, so it only works when `tailwindcss` is installed in the project's own `node_modules` (not a workspace hoist that changes the path layout).
- The `base` option passed to `compile()` is the directory of `main.css`, matching how Vite would set the working context.
