---
source: src/modules/stats/domain/index.ts
sha256: 9120fda0962a37c619811a8539da5940feaa11849f2cf11323c4f43151b3b100
generated_at: 2026-10-17T01:41:42.158211+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/domain/index.ts

## Purpose

Barrel (re-export) file for the stats domain layer. It aggregates the seven sibling domain modules into a single import entry point so that consumers (components, the store, tests) can import any pure domain rule—period math, figure calculations, chart/CSV/mermaid transforms, calendar helpers, series utilities—without naming individual file paths.

## Key elements

- **`export *` from seven modules** — `calendar.ts`, `chart.ts`, `csv.ts`, `figures.ts`, `mermaid.ts`, `period.ts`, `series.ts`. No logic is defined here; the file exists solely to flatten the domain namespace.

## Relationships

- **Re-exports** all public symbols from `calendar.ts`, `chart.ts`, `csv.ts`, `figures.ts`, `mermaid.ts`, `period.ts`, and `series.ts`.
- **Consumed by** the stats components (`ChartWithTable.vue`, `OperationsSection.vue`, `ProductsSection.vue`, `SalesSection.vue`, `StatsPeriodForm.vue`), `store.ts`, and the test files (`chart-with-table.spec.ts`, `domain.spec.ts`), which import domain utilities through this single entry point rather than from individual files.

## Notes

- Because every sub-module uses `export *`, a naming collision between any two of the seven files will surface here as a TypeScript error at build time, not at the consumer. When adding a new domain file, it must be registered in this barrel or it will not be visible to the rest of the module.
- The `@module` tag in the docblock is decorative (TypeScript barrel convention); it carries no runtime effect.
