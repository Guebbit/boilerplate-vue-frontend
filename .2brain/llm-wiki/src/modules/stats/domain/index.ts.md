---
source: src/modules/stats/domain/index.ts
sha256: aded725bbceba44e41e783d0fae7ab3943465aa6361fa5950df11ac0bbdcad50
signature: aded725bbceba44e41e783d0fae7ab3943465aa6361fa5950df11ac0bbdcad50
generated_at: 2026-11-10T05:48:17.595143+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/index.ts

## Purpose

Barrel (re-export) file for the stats domain layer. It provides a single import path so consumers can pull pure domain rules—calendar logic, chart data shaping, CSV generation, figure calculations, Mermaid diagram construction, and period utilities—from one module specifier without reaching into individual files.

## Key elements

- **`export * from './calendar.ts'`** – Re-exports calendar helpers (date math, range construction).
- **`export * from './chart.ts'`** – Re-exports chart-data shaping / aggregation functions.
- **`export * from './csv.ts'`** – Re-exports CSV serialization utilities.
- **`export * from './figures.ts'`** – Re-exports numeric-figure formatting/calculation rules.
- **`export * from './mermaid.ts'`** – Re-exports Mermaid diagram string builders.
- **`export * from './period.ts'`** – Re-exports period (date-range) domain types and helpers.

## Relationships

- **Upstream (re-exports):** Every symbol in `calendar.ts`, `chart.ts`, `csv.ts`, `figures.ts`, `mermaid.ts`, and `period.ts` is re-exported verbatim; this file contains no additional logic.
- **Downstream (consumers):** The stats components (`ChartWithTable.vue`, `OperationsSection.vue`, `ProductsSection.vue`, `SalesSection.vue`, `StatsPeriodForm.vue`), the Pinia store (`store.ts`), and the test suites (`domain.spec.ts`, `chart-with-table.spec.ts`, `stats-period-form.spec.ts`) all import domain symbols through this barrel rather than from individual sub-modules.

## Notes

- Because it uses `export *`, any name collision between two sub-modules would produce a silent ambiguity at the consumer's import site. Adding a new symbol with a duplicate name to a second sub-module is a foot-gun.
- All imported sub-modules use the `.ts` extension in the `from` clause, indicating the project relies on explicit file extensions (e.g., Vite or a bundler with `allowImportingTsExtensions`).
