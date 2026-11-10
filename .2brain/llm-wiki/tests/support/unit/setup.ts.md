---
source: tests/support/unit/setup.ts
sha256: 281369eafb35528db39a2989ffed13e38fb590ee2eff0ec2ec9f3912981c2db3
signature: 82c61c9caee66f42b641d8ff40aa74cffb2363f4d49df613c6698a71ed3a901f
generated_at: 2026-11-10T07:43:07.261172+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/setup.ts

## Purpose

Vitest global setup that polyfills browser APIs missing from jsdom (needed by Vuetify components), resets the shared TanStack Query cache and per-test state before every test, enforces a zero-tolerance policy on undeclared `[Vue warn]` messages, and manages the MSW request-interception lifecycle. It is the single file loaded by Vitest's `setupFiles` option for the `unit` project.

## Key elements

- **`ResizeObserverStub`** — minimal class assigned to `globalThis.ResizeObserver` if absent; required by `v-app-bar`, `v-number-input`, etc.
- **`globalThis.matchMedia`** — no-op `MediaQueryList` stub; required by Vuetify's "system" default theme.
- **`HTMLElement.prototype.setPointerCapture` / `releasePointerCapture`** — no-op polyfills for Vuetify's hold-to-repeat buttons.
- **`globalThis.visualViewport`** — set to an `EventTarget` instance if missing; used by `v-overlay` positioning.
- **`beforeEach → queryClient.clear()`** — drops every cached query and mutation so each test starts cold (the `QueryClient` is a module-level singleton shared by all stores).
- **`fc.configureGlobal`** — sets `numRuns` from `PROPERTY_RUNS` and optionally pins `seed` via `RANDOM_DATA_SEED` env var.
- **`beforeEach/afterEach → warnings.start()/finish()`** — wraps every test in a Vue-warn capture window; an undeclared `[Vue warn]` fails the test.
- **`beforeAll → server.listen({ onUnhandledRequest: 'error' })`** — starts MSW; any unmatched HTTP call throws immediately, preventing real socket usage.
- **`afterEach → server.resetHandlers()`** — discards handlers a spec registered with `server.use(...)` so they don't leak into the next test.
- **`afterAll → server.close()`** — stops interception and restores patched Node request modules.

## Relationships

- **tests/support/unit/msw-server.ts** — imports the shared `server` instance (an `msw` `SetupServerApi`); this file drives its `listen`/`resetHandlers`/`close` lifecycle in Vitest hooks.
- **tests/support/unit/expect-warning.ts** — imports `warnings`, a collector that `start()`/`finish()` around each test to capture and assert on `[Vue warn]` calls.
- **tests/support/unit/knobs.ts** — imports `PROPERTY_RUNS`, the global `numRuns` value passed to `fc.configureGlobal`.

## Notes

- **No `@/modules` or `@/kernel` imports.** The setup file is evaluated *before* the spec module, so any import here is resolved before a spec's hoisted `vi.mock(...)` can register. Pulling app code in here would silently turn mocks into no-ops. `query-client.ts` is the one permitted exception because its dependency graph stays within `@tanstack/vue-query`.
- **Polyfill guards use `??`.** Each assignment checks `globalThis.X ?? Stub`, so a real browser environment (or a later polyfill) is never overridden.
- **`RANDOM_DATA_SEED`** — when set, every fast-check property in the suite uses the same seed, making a committed counterexample reproducible. Specs that pin their own `seed` are unaffected.
- **MSW `onUnhandledRequest: 'error'`** means any HTTP call not explicitly handled by a test fails loudly rather than silently hitting a local backend on port 3000.
