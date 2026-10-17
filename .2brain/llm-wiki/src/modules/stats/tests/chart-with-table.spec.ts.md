---
source: src/modules/stats/tests/chart-with-table.spec.ts
sha256: 0949cfe1cf360a069a41e4630946466d5bf14d1c5c284da06a463b0fddb58f35
generated_at: 2026-10-17T01:43:04.076683+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/chart-with-table.spec.ts

## Purpose

Vitest spec for the `ChartWithTable` component. Mermaid rendering is stubbed (its own spec covers drawing); here the assertions pin which diagram source the component passes to the chart, that the table and the CSV carry the same rows, and that formula-prefixed labels are neutralised in the CSV output.

## Key elements

- **`downloadBlob`** – `vi.hoisted` mock that replaces the real download helper from `@guebbit/js-toolkit`, letting tests assert on the blob content, filename, and MIME type.
- **`MermaidStub`** – minimal component with `definition`/`label` props that renders the definition string into a `<pre data-test="stub-chart">`, making the passed source inspectable.
- **`CHART`** – fixture: a bar-chart `ChartModel` with two labels (`Oct 1`, `=Oct 2`) and one series of two values.
- **`mountBlock(chart?, kind?)`** – helper that mounts `ChartWithTable` with Vuetify, i18n, and the Mermaid stub; returns the wrapper for further interaction.
- **`beforeEach`** – clears mocks and loads the `en` locale before each test.
- **Test cases** (under `describe('ChartWithTable')`):
  - xy vs. pie source selection (`xychart-beta` / `pie ` prefix).
  - Toggle swaps chart ↔ table; table rows match source values; `aria-pressed` reflects state.
  - CSV download: correct header, values, filename, and that formula labels (`=Oct 2`) are prefixed with `'` to neutralise them.
  - Empty-data state: shows an empty indicator, hides toggle and CSV controls.

## Relationships

- **`src/modules/stats/components/ChartWithTable.vue`** – the component under test; mounted and interacted with throughout.
- **`src/modules/stats/domain/chart.ts`** (via `domain/index.ts`) – provides the `ChartModel` type used by the fixture and by the component's `chart` prop.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level to set up shared test infrastructure (module resolution / mocking) before the domain import is evaluated.

## Notes

- `wireModulesIntoCore()` runs *before* the type-only import of `ChartModel`; the import is placed after the call to respect side-effect ordering.
- Formula neutralisation: any label beginning with `=` gets a leading `'` in the CSV so spreadsheet apps don't interpret it as a formula. This is the key data-transformation behaviour pinned here.
- The mock of `@guebbit/js-toolkit` spreads the original module (`importOriginal`) and only overrides `downloadBlob`, so any other exports remain available.
- The `kind` prop (`'xy'` | `'pie'`) determines which diagram definition the component builds; the test asserts on the leading token of that definition rather than the full Mermaid text.
