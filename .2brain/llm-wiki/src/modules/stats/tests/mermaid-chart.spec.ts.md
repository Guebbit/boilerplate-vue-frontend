---
source: src/modules/stats/tests/mermaid-chart.spec.ts
sha256: 7f1426d31005b10872148f6a5c3a1e8d66c9cb42d3d19a60d665e5a738e1d819
generated_at: 2026-10-17T01:43:49.280054+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/mermaid-chart.spec.ts

## Purpose

Vitest spec that pins the behavioural contract of `MermaidChart.vue` against a mocked Mermaid library. It verifies the component always configures Mermaid with strict security, renders the resulting SVG into the DOM, survives a definition change, discards a stale (slower) render in favour of the newest one, and surfaces a visible failure marker when Mermaid throws.

## Key elements

- **`mermaidMock`** (`vi.hoisted`) — replaces the entire `mermaid` module with stubs for `initialize` and `render`; every test asserts against these two entry points.
- **`svgOf(text)`** — tiny helper returning a `MermaidRenderResult`-shaped object with a single `<text>` node, used as the mock's resolved value.
- **`mountChart(definition)`** — mounts `MermaidChart` with a fixed `label` prop and the real Vuetify + i18n plugins; keeps each test's setup to one call.
- **Test cases** (5 `it` blocks under one `describe`):
  1. Strict security level, `suppressErrorRendering`, `startOnLoad: false`; SVG text lands in DOM.
  2. `role="img"` element carries the `aria-label` from the `label` prop.
  3. Changing the `definition` prop triggers a re-render with the new text.
  4. Race: an older render that resolves *after* a newer one is discarded.
  5. Mermaid `render` rejecting → a `[data-test=stats-chart-failed]` element appears.

## Relationships

- **`src/modules/stats/components/MermaidChart.vue`** — the system under test. Every assertion targets its rendered output or the arguments it passes to the mocked Mermaid API.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module top-level (before any test) to patch the module-resolution layer so `@/i18n`, `@/ui/vuetify`, and relative imports resolve correctly outside the Vite dev-server context.

## Notes

- The mock is created inside `vi.hoisted` so it survives Vitest's import hoisting; referencing it from the `vi.mock` factory is the standard pattern.
- Tests use promise chains (`.then`) with `flushPromises()` rather than async/await + `vi.useFakeTimers`; the race test manually controls resolution order via a captured `resolve` handle.
- `loadLocale('en')` runs in `beforeEach` to reset i18n state between tests — omitting it can cause locale leakage from a prior spec file.
- The failure assertion relies on the component emitting a `data-test="stats-chart-failed"` attribute; that attribute is a test-only contract, not a public API.
