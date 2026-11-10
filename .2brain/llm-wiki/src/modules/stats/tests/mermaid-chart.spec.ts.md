---
source: src/modules/stats/tests/mermaid-chart.spec.ts
sha256: 7f1426d31005b10872148f6a5c3a1e8d66c9cb42d3d19a60d665e5a738e1d819
signature: 1702f9365b4e048b8f13c8176cb1cf9828181d3796d64e8baf289c9981794bcf
generated_at: 2026-11-10T05:51:38.768670+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/mermaid-chart.spec.ts

## Purpose

Unit tests for the `MermaidChart` component with the Mermaid library fully mocked. Pins the component's contract with Mermaid (strict security level, errors surfaced not drawn), verifies the rendered SVG lands as a DOM node, confirms a newer definition beats a slower older render, and checks the failure-state element.

## Key elements

- **`mermaidMock`** — `vi.hoisted` object exposing `initialize` and `render` as `vi.fn()`s; injected via `vi.mock('mermaid', …)`.
- **`svgOf(text)`** — returns a minimal `{ svg: '<svg>…<text>…</text></svg>' }` object used as the mock render result.
- **`mountChart(definition)`** — mounts `MermaidChart` with `props: { definition, label: 'Sales per day' }` and the real `vuetify` + `i18n` plugins.
- **`beforeEach`** — clears all mocks and loads the `'en'` locale via `loadLocale`.
- **Test: "strict security level"** — asserts `initialize` receives `securityLevel: 'strict'`, `suppressErrorRendering: true`, `startOnLoad: false`; asserts `render` is called with the raw definition string; asserts the SVG `<text>` content appears in the DOM.
- **Test: "names the picture"** — asserts the `[role=img]` element carries `aria-label="Sales per day"`.
- **Test: "redraws when definition changes"** — `setProps` with a new definition triggers a re-render; DOM reflects the new value.
- **Test: "keeps the newest render"** — first render is held open via a manually-resolved promise; second resolves immediately. Releasing the first *after* the second still shows "newer".
- **Test: "says so when the library throws"** — `render` rejects; asserts `[data-test=stats-chart-failed]` exists.

## Relationships

- **`src/modules/stats/components/MermaidChart.vue`** — the component under test; all assertions target its rendered DOM and the props it forwards to Mermaid.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level (before any test) to register custom module-resolution aliases so that `@/i18n`, `@/ui/vuetify`, and other `@/` imports resolve in the unit-test environment.

## Notes

- The file uses `vi.hoisted` for the Mermaid mock because `vi.mock` calls are hoisted above imports; a plain `const` would not be visible inside the mock factory.
- Async tests use `.then()` chains with `flushPromises()` rather than `async/await`; keep that convention when adding cases.
- The race-condition test deliberately creates an unresolved promise and stores its resolver in a closure variable (`releaseFirst`); the component is expected to discard that stale result silently.
- The failure-state assertion relies on the `data-test=stats-chart-failed` attribute — if the component changes that attribute, this test breaks without changing its intent.
