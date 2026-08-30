# tests/support/unit/jsdom-quiet-css.environment.ts

## Purpose

A custom Vitest environment (`jsdom-quiet-css`) that wraps the built-in jsdom environment to suppress Vuetify's `@media`-in-`@layer` CSS parsing errors while keeping CSS fully enabled. It exists so test output stays readable without sacrificing the ability to assert on computed styles.

## Key elements

- **`createFilteredConsole()`** — Builds a jsdom `VirtualConsole` that forwards everything to the real `globalThis.console` but drops events where `type === 'css-parsing'`. Also unwraps `unhandled-exception` events to print the underlying `cause.stack` instead of the opaque wrapper message. Captures the real console *before* jsdom swaps `globalThis.console` during boot.
- **`withFilteredConsole(options)`** — Spreads the incoming Vitest environment options and injects the filtered `virtualConsole` under `options.jsdom`. Called from both `setup` and `setupVM` so the custom console wins over Vitest's default.
- **`environment` (default export)** — The `Environment` object registered as `'jsdom-quiet-css'`. Delegates to `builtinEnvironments.jsdom.setup` / `.setupVM` with the patched options.

## Relationships

- **package.json** — The file depends on `vitest` (`vitest/runtime`, `vitest/environments`) and `jsdom` (`VirtualConsole`), all declared in the project's `package.json`. No other project files import this module except the Vitest config that references `'jsdom-quiet-css'` by name.

## Notes

- Must live in a separate file (not inline in `vitest.config.ts`) because the config is serialized to worker processes and a `VirtualConsole` instance is not cloneable.
- The `import type { Environment }` is deliberately type-only to avoid pulling the deprecated runtime export of `vitest/environments` into the bundle.
- The file is a temporary workaround; the doc comment instructs switching back to `environment: 'jsdom'` in `vitest.config.ts` once jsdom's CSS parser handles nested at-rules inside `@layer`.
- Vitest spreads the environment's options *after* its own `virtualConsole` default, so this file's console wins without needing to override anything else.
