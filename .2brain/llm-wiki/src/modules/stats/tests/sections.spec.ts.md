---
source: src/modules/stats/tests/sections.spec.ts
sha256: 00c7985994e4dea9efdf928d3f70cb055cc087cd6c68ca19373235aa94dfb52c
generated_at: 2026-10-17T01:44:12.431579+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/sections.spec.ts

## Purpose

Vitest spec that mounts the three dashboard presentational blocks (Sales, Products, Operations) with canned, pre-computed stats and asserts only what they **format and word** — card labels, chart definitions, CSV columns, empty-state copy, and link targets. It deliberately does not test any computation; the figures arrive from the API as given.

## Key elements

- **`wireModulesIntoCore()`** — called at module top level to register all enabled modules into the core so the router and i18n see them.
- **`MermaidStub`** — replaces the real `MermaidChart` component; renders `{{ definition }}` inside a `<pre data-test="stub-chart">` so tests can assert the Mermaid source text.
- **`downloadBlob` (mocked)** — hoisted via `vi.hoisted`; intercepts CSV export calls to assert file name and column/row content.
- **`router`** — a real `vue-router` instance with `createMemoryHistory` and the full module route tree (`collectModuleRoutes(enabledModules)`), enabling `router-link` resolution for product-detail links.
- **`GLOBAL`** — shared mount options: `[router, vuetify, i18n]` plugins plus the `MermaidChart` stub.
- **`figures(over?)`** — factory returning a complete `SalesFigures` object, spreadable with per-test overrides.
- **`describe('SalesSection')`** — 5 tests: headline cards with % change, zero-previous fallback, two charts (bar + line) with timezone-correct labels, revenue table + CSV export, multi-currency separation, empty state.
- **`describe('ProductsSection')`** — 3 tests: product link carries `from`/`to`/`interval` query params, category pie + "counts in both" footnote, empty state.
- **`describe('OperationsSection')`** — 3 tests: rate cards show counts behind percentages, payment-mix pie names method · provider, absent deadline omitted from copy.

## Relationships

| Neighbor | Interaction |
|---|---|
| `components/SalesSection.vue` | Subject under test — mounted, props fed, DOM asserted. |
| `components/ProductsSection.vue` | Subject under test — product link `href`, pie definition, empty state. |
| `components/OperationsSection.vue` | Subject under test — rate cards, payment-mix chart, pipeline wording. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` registers module routes and i18n locale files so the shared `router` and `i18n` plugins are fully populated before any mount. |

## Notes

- **Mermaid is never rendered.** Tests read the raw `definition` prop via the stub; do not expect SVG or DOM assertions on chart internals.
- **`downloadBlob` is hoisted.** Because `vi.mock` is hoisted above imports, the mock fn must be created with `vi.hoisted` to be referenceable inside the factory.
- **Timezone matters in chart assertions.** Bucket `start` timestamps are UTC (e.g. `2026-09-30T22:00Z`); the component converts to `Europe/Rome` (the `PERIOD` timezone), so the expected label is `"Oct 1"`, not `"Sep 30"`.
- **CSV uses `\r\n` line endings.** Tests split on `'\r\n'`; a regression to `\n` will fail silently on the line-count assertion.
- **The router is real, not a stub.** Product-link tests rely on `router-link` producing an `href` attribute; a stubbed router would skip the route-resolution path entirely.
