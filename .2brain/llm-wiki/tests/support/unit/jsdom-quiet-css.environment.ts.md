---
source: tests/support/unit/jsdom-quiet-css.environment.ts
sha256: 961e805d76cd0eb236f6933585ff14cd904e63ef3f6357106b1cc4c1a927f6e8
generated_at: 2026-10-17T02:28:44.712150+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/jsdom-quiet-css.environment.ts

## Purpose

A custom Vitest environment (`jsdom-quiet-css`) that wraps the built-in jsdom environment and injects a filtered `VirtualConsole` to suppress the "Could not parse CSS stylesheet" errors jsdom emits when it encounters Vuetify's nested `@media`-in-`@layer` rules. All other CSS parsing, computed-style assertions, and jsdom error reporting remain fully intact.

## Key elements

- **`createFilteredConsole()`** — Builds a jsdom `VirtualConsole` that forwards all `console.*` calls to the captured real console, but drops `jsdomError` events whose `type` is `'css-parsing'`. Unhandled-exception errors are re-printed with their stack trace.
- **`withFilteredConsole(options)`** — Spreads the caller's jsdom options and injects a fresh `virtualConsole` instance, ensuring it overrides Vitest's default after the spread.
- **`environment` (default export)** — The `Environment` object Vitest loads. Sets `name: 'jsdom-quiet-css'`, `viteEnvironment: 'client'`, and delegates `setup` / `setupVM` to the built-in jsdom environment with the filtered console injected.

## Relationships

No dependency-graph neighbors recorded.

## Notes

- **Lazy `realConsole` capture:** `globalThis.console` is read *before* `VirtualConsole` is instantiated because jsdom swaps `globalThis.console` for its own proxy on boot; capturing it later would create a forwarding loop.
- **Not built in `vitest.config.ts`:** The `VirtualConsole` is created inside the environment file (not the config) because the config is serialized to worker processes and a `VirtualConsole` is not cloneable.
- **`type` property is untyped:** jsdom tags `jsdomError` events with a `type` string that is not part of the `Error` interface; the code casts to `Error & { type?: string }`.
- **Temporary measure:** The doc-block notes this file can be removed (revert to `environment: 'jsdom'`) once jsdom's parser handles nested at-rules inside `@layer`.
