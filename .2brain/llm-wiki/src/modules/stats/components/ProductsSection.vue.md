---
source: src/modules/stats/components/ProductsSection.vue
sha256: f09fbec31fb83163862dd57ac09abe496381d9e88ef1f53e932a01b626d73b0f
generated_at: 2026-10-17T01:40:26.266888+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stats/components/ProductsSection.vue

## Purpose

Renders the "Products" section of the stats dashboard: a compact table of top products (units ordered/reversed, net units, net sales) and one category chart per currency. Each product row links to its dedicated sales page, forwarding the current period.

## Key elements

- **Props** — `products?: ProductStats`, `categories?: CategoryStats`, `period: StatsPeriodChoice`. The two data props are optional so the section can render an empty state.
- **`productLink(productId)`** — Builds a locale-aware route (`routerLinkI18n`) to the `StatsProductSales` route, passing `from`, `to`, and `interval` as query params so the product page shows the same period.
- **`categoryCharts`** (computed) — Groups `categories.categories` rows by `currency`, then maps each group into a `ChartModel` with a single `bar`-kind series of `netSales` values. One chart per currency because slices across currencies don't share a whole.
- **Template** — Uses `v-table` + `v-focusable-scroll` for the product table, and `ChartWithTable` (with `kind="pie"`) for each category chart. `formatCurrency` formats monetary cells.

## Relationships

- **ChartWithTable.vue** — Rendered via `v-for` over `categoryCharts`; receives each `ChartModel` plus `kind="pie"`, `label-title`, and `file-name`.
- **../domain (chart.ts, period.ts, index.ts)** — Supplies the `ChartModel` and `StatsPeriodChoice` types consumed by the computed and props.
- **StatsDashboard.vue** — Parent view that instantiates this component and provides `products`, `categories`, and `period`.
- **sections.spec.ts** — Tests this section's rendering and behavior.

## Notes

- The `ChartModel` in `categoryCharts` declares `kind: 'bar'`, but the template passes `kind="pie"` to `ChartWithTable`. The `kind` field in the model is effectively overridden at the call site.
- Component name is set in a separate non-`setup` `<script>` block because `<script setup>` cannot declare `name`; this is needed for `<KeepAlive>` and devtools.
- Category rows intentionally do not sum to the grand total: a product appearing in multiple categories is counted in each.
- The empty-state check is `!products || products.products.length === 0`; category charts simply don't render if the `categories` prop is absent or empty.
