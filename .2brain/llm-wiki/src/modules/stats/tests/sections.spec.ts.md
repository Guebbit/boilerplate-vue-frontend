---
source: src/modules/stats/tests/sections.spec.ts
sha256: c29c0523885cd5603f8a5f2aca89bf5f0083f8709ad284cf304efbbb6517faec
signature: b5cbbf52f358b93f009459b2842cf7a9ee89e99961295d519ee1ccaca409fc27
generated_at: 2026-11-10T05:52:11.591924+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/tests/sections.spec.ts

## Purpose

Vitest spec that exercises the three presentational blocks of the stats dashboard (`SalesSection`, `ProductsSection`, `OperationsSection`) with canned API-shaped data. It asserts how each block formats numbers, phrases comparisons, renders chart stubs, and produces CSV output — never how the figures themselves are computed.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope so i18n, routing, and module registry are available before any `mount`.
- **`downloadBlob` (vi.hoisted mock)** — spies on the CSV download helper from `@guebbit/js-toolkit` so tests can assert the generated CSV content and filename.
- **`router`** — a `createMemoryHistory` router wired with `collectModuleRoutes(enabledModules)`; used so product detail links resolve to real paths.
- **`MermaidStub`** — replaces `MermaidChart` with a `<pre>` that echoes the `definition` prop, letting tests inspect the Mermaid source text without a rendering engine.
- **`GLOBAL`** — shared `global` mount options (router, vuetify, i18n plugins + MermaidChart stub) passed to every `mount` call.
- **`PERIOD` / `LIMITS`** — shared period (`Europe/Rome`, 1–2 Oct 2026) and ceiling fixtures included in every stats payload.
- **`figures(over?)`** — returns a fully populated `SalesFigures` object, overridable per test case.
- **`describe('SalesSection')`** — asserts headline cards, percentage change vs. previous period, "No earlier figure" edge case, bar/line chart labels with timezone-shifted dates, revenue table rows, CSV export columns, multi-currency isolation, and the empty state.
- **`describe('ProductsSection')`** — asserts product links carry period query params, category pie-chart Mermaid source, the "counts in both" disclaimer, and the empty state.
- **`describe('OperationsSection')`** — asserts rate cards word the underlying counts, payment-mix pie slices by method + provider, and that a missing `nearestPayBy` omits the deadline phrase.

## Relationships

- **`src/modules/stats/components/SalesSection.vue`** — primary SUT for the first `describe` block; receives a `SalesStats` prop.
- **`src/modules/stats/components/ProductsSection.vue`** — primary SUT for the second `describe` block; receives `ProductStats`, `CategoryStats`, and `period` props.
- **`src/modules/stats/components/OperationsSection.vue`** — primary SUT for the third `describe` block; receives `OperationsStats`, `CustomerStats`, `PipelineStats`, and `PaymentMix` props.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()` to bootstrap the module registry, i18n, and router state required before mounting any section component.

## Notes

- Timezone matters: the `PERIOD` is `Europe/Rome`, so a `22:00 UTC` bucket start renders as the *next* calendar day in the chart labels. Tests assert this shift explicitly.
- `vi.mock('@guebbit/js-toolkit')` uses `importOriginal` to preserve all other exports while swapping only `downloadBlob` for the spy — any new export added to that package will pass through untouched.
- `beforeEach` pushes the router to `/en/sales/stats` and loads the `en` locale; tests that check link `href` values depend on this base path being active.
- The file imports types from a bare `@types` specifier (not a path) — ensure that alias resolves in the Vitest config.
