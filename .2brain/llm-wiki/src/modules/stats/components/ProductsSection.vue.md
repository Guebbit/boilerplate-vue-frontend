---
source: src/modules/stats/components/ProductsSection.vue
sha256: f620aae6a46a2b3e41bdfc4759b0baa28220761237e4f58bab29ab35c3af661d
signature: edcbcfa0f0638e360b395d17ebb3129b1ce6f9298a375407a17bfe2c706bc106
generated_at: 2026-11-10T05:46:46.153148+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/ProductsSection.vue

## Purpose

A `<section>` component inside the stats dashboard that presents two data views: a table of top products (each row links to that product's dedicated sales page, passing the active period along) and one pie-per-currency chart of net sales by category. It exists to keep these two related but distinct "answers" in a single, self-contained block of the dashboard.

## Key elements

- **`name: 'ProductsSection'`** — declared in a separate `<script>` block because `<script setup>` cannot set a component name; needed for `<KeepAlive>` and devtools.
- **Props** — `products` (`ProductStats`), `categories` (`CategoryStats`), `period` (`StatsPeriodChoice`). The first two are optional (empty-state handled in template); `period` is required and forwarded to product links.
- **`productLink(productId)`** — builds a locale-aware route to `StatsProductSales`, carrying `from`, `to`, and `interval` as query params via `routerLinkI18n`.
- **`categoryCharts` (computed)** — splits `categories.categories` rows by `currency`, producing one `ChartModel` per currency with labels, a single "net sales" series, and a translated title. `Number(netSales)` is applied here at the chart boundary only.
- **Template** — renders a `v-table` with `v-focusable-scroll` for products, and a `<ChartWithTable>` (pie kind) per currency for categories. Includes `data-test` attributes throughout for E2E selectors.

## Relationships

- **`src/modules/stats/components/ChartWithTable.vue`** — rendered once per currency chart; receives the built `ChartModel`, `kind="pie"`, a label title, and a `file-name` for exports.
- **`src/modules/stats/domain/index.ts`** — barrel re-export; source of the `ChartModel` and `StatsPeriodChoice` types used in props and the computed.
- **`src/modules/stats/domain/chart.ts`** — defines `ChartModel` (title, labels, series shape) consumed by the `categoryCharts` computed.
- **`src/modules/stats/domain/period.ts`** — defines `StatsPeriodChoice` (`from`, `to`, `interval`) passed as a prop and forwarded to product links.
- **`src/modules/stats/views/StatsDashboard.vue`** — parent view that mounts this section and supplies the `products`, `categories`, and `period` props.
- **`src/modules/stats/tests/sections.spec.ts`** — unit/e2e tests that render this component and assert on its `data-test` hooks.

## Notes

- **Two script blocks are intentional.** The plain `<script>` exists solely to declare the component `name`; the `<script setup>` holds all logic. Do not merge them — `<script setup>` cannot express a static `name` the same way.
- **Category overlap.** A product belonging to two categories appears in both category rows, so category totals will exceed the grand total. The template includes a translated note (`stats-page.note-categories`) explaining this.
- **Per-currency charts.** The API returns money grouped by currency; the computed groups rows by `currency` and emits one chart per currency rather than a single mixed-currency pie.
- **Row key.** Product table rows are keyed by `` `${row.productId}-${row.currency}` `` to tolerate the same product appearing in multiple currencies.
- **Empty state.** If `products` is absent or has zero entries, the table is replaced by a "no data" paragraph (`data-test="products-empty"`); the category section simply renders no charts.
