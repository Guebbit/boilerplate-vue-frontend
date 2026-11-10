---
source: src/ui/composables/use-media-query.ts
sha256: 38ab1d87f637e34b1e10e583e54194c4f8ec9fc8240f8fe2f5798623e086b205
signature: aced16319cd425e1ad83781d14b07b7aebe4a79b4c3bf4e6ba932824d50b7650
generated_at: 2026-11-10T06:24:35.351121+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-media-query.ts

## Purpose

Provides a single reactive `useMediaQuery` composable that wraps `window.matchMedia` in a Vue ref. It exists because the project does not depend on `@vueuse/core`, and Vuetify's own `matchMedia` usage is limited to theming—so this is the one sanctioned place for a component to ask the browser about pointer/input modality.

## Key elements

- **`useMediaQuery(query: string): Readonly<Ref<boolean>>`** — Creates a `MediaQueryList` via `globalThis.matchMedia(query)`, seeds a reactive `ref` with the initial `matches` value, and registers a `change` listener that syncs the ref. Returns a `readonly` ref so callers cannot mutate it.
- **`update(event: MediaQueryListEvent)`** (module-private) — Copies `event.matches` into the ref.
- **Cleanup** — `onScopeDispose` removes the listener when the caller's effect scope is torn down.

## Relationships

No graph neighbors.

## Notes

- The second argument to `onScopeDispose(fn, true)` suppresses the "no active scope" warning so unit tests that call `useMediaQuery` outside a component scope work silently.
- The module doc explicitly distinguishes input modality (hover, pointer) from viewport width, pointing to `docs/theory/design-system.md`. Treat this composable as a modality tool, not a responsive-breakpoint helper.
- Uses `globalThis.matchMedia` rather than `window.matchMedia`, which keeps the file testable with a `globalThis` stub.
