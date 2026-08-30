# tests/support/unit/setup.ts

## Purpose

Vitest setup file that polyfills browser APIs missing from jsdom so Vuetify components (v-app-bar, v-number-input, v-overlay, etc.) can render in unit tests. It is deliberately free of any application imports to avoid breaking `vi.mock` hoisting semantics.

## Key elements

- **`ResizeObserverStub`** — minimal class providing `observe`, `unobserve`, `disconnect`; assigned to `globalThis.ResizeObserver` only if not already present. Satisfies Vuetify components that call `ResizeObserver` on mount.
- **`globalThis.matchMedia` polyfill** — returns a static `MediaQueryList`-shaped object (`matches: false`) with no-op listener methods. Prevents crashes from Vuetify's "system" default theme logic.
- **`HTMLElement.prototype.setPointerCapture` / `releasePointerCapture`** — no-op stubs for the hold-to-repeat buttons in `v-number-input`.
- **`globalThis.visualViewport`** — set via `Object.defineProperty` to an `EventTarget` instance (if not already present); satisfies v-overlay positioning code.

All polyfills use the `??=` / `??` guard pattern so they do not overwrite a real browser API if the test environment changes.

## Relationships

- **docs/tools/component-testing.md** — documents the component-testing workflow in which this setup file participates; readers of that doc are expected to already know this file exists and what it provides.

## Notes

- **No app imports, by design.** The file must not import from `@/modules` or `@/kernel`. Because Vitest evaluates setup files *before* the spec module, any app code imported here would be resolved and bound before a spec's hoisted `vi.mock(...)` call registers, silently turning the mock into a no-op for the affected module (e.g., the generated API client).
- The file is referenced by the Vitest `setupFiles` config (see the project's `vitest.config.*`); it is not imported by any test file directly.
