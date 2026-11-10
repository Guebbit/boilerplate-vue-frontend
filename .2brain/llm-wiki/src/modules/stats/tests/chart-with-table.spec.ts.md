---
source: src/modules/stats/tests/chart-with-table.spec.ts
sha256: 0949cfe1cf360a069a41e4630946466d5bf14d1c5c284da06a463b0fddb58f35
signature: f93a7b630b081715a87c33b36abd4bcdb5f1bddbe728ed0782692ee3721850c9
generated_at: 2026-11-10T05:50:19.751802+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/chart-with-table.spec.ts

## Purpose

Unit tests for the `ChartWithTable` component. Mermaid rendering is stubbed out, so the suite pins down: (1) which Mermaid source string the component hands to the chart, (2) that the toggleable table carries the same rows, (3) that CSV export produces the expected content with formula cells neutralised, and (4) that an empty dataset hides all controls.

## Key elements

- **`downloadBlob`** – hoisted `vi.fn()` that replaces the real CSV-downloader from `@guebbit/js-toolkit`; asserted on after the CSV button is clicked.
- **`vi.mock('@guebbit/js-toolkit', …)`** – partial mock that spreads the real module and swaps only `downloadBlob`.
- **`MermaidStub`** – minimal Vue component (`<pre data-test="stub-chart">{{ definition }}`) that stands in for `MermaidChart`, exposing the `definition` prop for inspection.
- **`CHART`** – a two-label, single-bar `ChartModel` fixture (`'Oct 1'`, `'=Oct 2'`, values `[10, 20.5]`).
- **`mountBlock(chart?, kind?)`** – mounts `ChartWithTable` with Vuetify, i18n, and `MermaidChart` stubbed; returns a Vue Test Utils wrapper.
- **`wireModulesIntoCore()`** – called before the `ChartModel` type import to initialise module-registry state required by the domain layer.
- **Four `it` blocks** – xy/pie definition check, chart⇄table toggle round-trip, CSV download assertion, empty-state rendering.

## Relationships

- **`ChartWithTable.vue`** – the component under test; mounted directly via `@vue/test-utils`.
- **`../domain` (`index.ts` → `chart.ts`)** – provides the `ChartModel` type used to type the `CHART` fixture and `mountBlock`'s parameter.
- **`tests/support/unit/wire-modules.ts`** – called once at module top-level to register module dependencies so the domain barrel import resolves correctly in the test environment.

## Notes

- `downloadBlob` uses `vi.hoisted` because the `vi.mock` factory is hoisted above imports; the mock must be defined before the factory runs.
- The domain type import (`import type { ChartModel } from '../domain'`) appears **after** the `wireModulesIntoCore()` call. This ordering is intentional: the domain barrel has side-effects that require the module registry to be wired first.
- Formula-cell neutralisation: labels beginning with `=` (e.g. `'=Oct 2'`) get a leading single-quote in the CSV output (`'=Oct 2`) to prevent spreadsheet injection.
- The toggle test asserts `aria-pressed="true"` on the chart-toggle button when the table view is active.
