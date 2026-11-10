---
source: tests/support/unit/jsdom-quiet-css.environment.ts
sha256: 961e805d76cd0eb236f6933585ff14cd904e63ef3f6357106b1cc4c1a927f6e8
signature: 26de881c43e3735141dfef9634cc9049bb5e7def3056e83e42cf72020a378d4a
generated_at: 2026-11-10T07:41:33.568054+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/jsdom-quiet-css.environment.ts

## Purpose

Custom Vitest environment that wraps the built-in jsdom environment and filters out one class of noise: the "Could not parse CSS stylesheet" errors jsdom emits when it encounters Vuetify's `@media` nested inside `@layer`. All other jsdom output and all other CSS processing remain intact, so computed-style assertions still work.

## Key elements

- **`CSS_PARSING_ERROR`** — string constant (`'css-parsing'`) matching the `type` jsdom stamps on CSS parse failures.
- **`createFilteredConsole()`** — builds a jsdom `VirtualConsole` that forwards all events to the real console except `jsdomError` events whose `type` is `CSS_PARSING_ERROR`. Also special-cases `unhandled-exception` to print the cause's stack trace.
- **`jsdomEnvironment`** — reference to `builtinEnvironments.jsdom` from `vitest/runtime`; this environment delegates all setup to it.
- **`withFilteredConsole(options)`** — spreads the incoming jsdom options and injects a fresh `virtualConsole` under `options.jsdom`. Called at setup time, not at config time.
- **`environment`** (default export) — the Vitest `Environment` object with `name: 'jsdom-quiet-css'`, `viteEnvironment: 'client'`, and `setup`/`setupVM` that pass the filtered-console options through to the built-in jsdom setup.

## Relationships

No graph neighbors. The file is a leaf in the dependency graph; it imports from `vitest/runtime`, `jsdom`, and `vitest/environments` (type-only) but is not imported by any other project file listed in the graph. It is referenced by name (`// @vitest-environment jsdom-quiet-css`) from spec files.

## Notes

- **Grab `globalThis.console` early.** jsdom replaces `globalThis.console` with its own instance on boot, which routes back into this virtual console. The real console is captured *before* `VirtualConsole` is created to avoid infinite message loops.
- **Why not in `vitest.config.ts`?** The config is serialized to worker processes; a `VirtualConsole` instance is not cloneable. Building it inside `setup`/`setupVM` avoids that. Vitest spreads the environment's returned options *after* its own defaults, so this `virtualConsole` wins.
- **Type-only import of `Environment`.** Using `import type` prevents accidentally pulling in the deprecated runtime export from `vitest/environments`.
- **`css: false` was rejected** because it disables all CSS processing, removing the ability to assert on computed styles. This approach keeps CSS fully active and drops only the one error type.
- **Temporary by design.** The header comment says to revert to plain `environment: 'jsdom'` once jsdom's parser handles nested at-rules inside `@layer`.
