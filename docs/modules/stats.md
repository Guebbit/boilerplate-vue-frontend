# stats

::: tip At a glance
**Owns** — the sales dashboard and one product's sales page: headline cards, charts, tables, a "show as table" toggle and a client-side CSV for every block.
**Depends on** — nothing. It reads eight backend GETs and links to other pages by route name.
**Breaks if you change** — nothing outside this folder. No module depends on it.
:::

| Fact                    | This module                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Subdomain**           | `supporting` — Specific to this business but not a differentiator. Kept plain. |
| **Screens**             | 2 — `StatsDashboard`, `StatsProductSales`                                      |
| **Store**               | `stats`                                                                        |
| **Menu entries**        | `StatsDashboard`                                                               |
| **API calls**           | 8                                                                              |
| **Depends on**          | _nothing_                                                                      |
| **Depended on by**      | _nothing_                                                                      |
| **Languages**           | `en` · `it`                                                                    |
| **Publishes**           | _nothing_ — no barrel, so no sibling may import it                             |
| **Backend counterpart** | `stats` in `boilerplate-node-backend`                                          |

## The map

`stats` imports no sibling. The one link out, from a product's page to the staff orders list
(filtered by product and paid days), is resolved with `linkIfRouted`: a build with no `orders`
module renders no button instead of a dead one.

## The story

The page asks one question — _what happened between these two days?_ — and shows the backend's
answer. **Nothing here computes a figure.** Net sales, reversals, the average order value and the
change against the previous period all arrive finished, because the backend takes its money from the
invoices and credit notes, which are the shop's frozen record. A second implementation of "net
sales" here would be a second thing that can disagree with them.

```mermaid
sequenceDiagram
    participant P as Period form
    participant V as StatsDashboard
    participant S as stats store
    participant A as GET /stats/*
    P->>V: apply (from, to, interval)
    V->>S: loadDashboard(period)
    par seven reads
        S->>A: sales, products, categories, payments
        S->>A: operations, customers
        S->>A: pipeline (no period: a snapshot of now)
    end
    A-->>S: answers, held as given
    S-->>V: blocks render from the store
```

- **Days are the shop's.** `from` and `to` are calendar days (`YYYY-MM-DD`) and the answer reports
  the zone it used (`period.timeZone`). A bucket's start is read back in that zone, never the
  browser's: a 00:00 Rome bucket would otherwise label as the evening before in London.
- **The form refuses what the API refuses.** At most two years and 400 buckets
  (`domain/period.ts`), so the visitor reads why instead of a 422. The bucket size follows the
  range until the visitor picks one.
- **Money stays per currency.** One group per currency, never converted, each with its own cards,
  charts and revenue table.
- **A product's page** takes its period from the URL, so the link from the dashboard, a reload and a
  shared address all show the same question.

Known limits are stated on the page itself, not only here: an offline payment counts from the day it
was recorded; shipping is exact for full refunds only; a product in two categories counts in both;
deleting an order drops it from counts but not from the invoices' money.

## Charts: Mermaid, and why no chart library

The charts are [Mermaid](https://mermaid.js.org/) `xychart-beta` (bars and lines) and `pie`,
drawn from text. Mermaid was already a docs dev-dependency; this promoted it to a runtime
dependency, and it is loaded by a dynamic `import()` inside `MermaidChart.vue`, so it lives in the
stats routes' own chunks and never in the entry bundle (`entry-chunk-budget.spec.ts` holds that).

What this buys is zero new dependencies for six plain bar, line and pie charts. What it costs is
real, and accepted: **no tooltips and no zoom**. That is why every chart has a "show as table"
toggle — the table is the accessible alternative to a picture, and the source of the CSV.

Three rules keep it safe:

- **Labels are escaped before they enter Mermaid's text.** A product or category title is text a shop
  owner typed. `safeLabel` (`domain/mermaid.ts`) keeps letters and digits of any script and a few plain marks, and turns
  everything else (quotes, `#`, `;`, brackets, `%` directives, line breaks) into a space.
- **`securityLevel: 'strict'`** stays on: no clickable nodes, no HTML in labels.
- **The SVG is attached as a parsed node**, not set as `innerHTML`.

The CSV is built in the browser from the rows on screen. An aggregate holds no personal data, so it
needs no server route and no step-up; a cell a spreadsheet would read as a formula is prefixed with
`'`.

## State

Store `stats`, from `store.ts`. Only what the setup function returns is listed.

| Kind        | Members                                                                                                        | What it is                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **State**   | `sales` · `products` · `categories` · `paymentMix` · `operations` · `customers` · `pipeline` · `productSeries` | The last answer of each read, as the API gave it. |
| **Getters** | `loading`                                                                                                      | The shared loading flag.                          |
| **Actions** | `loadDashboard` · `loadProductSales`                                                                           | Everything that calls the API.                    |

## Screens

| Path                              | Route name          | Access | Permission   | View                          |
| --------------------------------- | ------------------- | ------ | ------------ | ----------------------------- |
| `sales/stats`                     | `StatsDashboard`    | `auth` | `read Stats` | `views/StatsDashboard.vue`    |
| `sales/stats/products/:productId` | `StatsProductSales` | `auth` | `read Stats` | `views/StatsProductSales.vue` |

The permission is `read:Stats`, which the backend grants to `manager` and `admin`. See
[Security](../tools/security.md#route-guards).

## Wiring

#### Endpoints called

| Call                              | Response schema                 |
| --------------------------------- | ------------------------------- |
| `GET /stats/sales`                | `GetSalesStatsResponse`         |
| `GET /stats/products`             | `GetProductStatsResponse`       |
| `GET /stats/products/{productId}` | `GetProductSalesSeriesResponse` |
| `GET /stats/categories`           | `GetCategoryStatsResponse`      |
| `GET /stats/payments`             | `GetPaymentMixStatsResponse`    |
| `GET /stats/operations`           | `GetOperationsStatsResponse`    |
| `GET /stats/customers`            | `GetCustomerStatsResponse`      |
| `GET /stats/pipeline`             | `GetPipelineStatsResponse`      |

#### Navigation entries

| Route            | Label key                | Section | Order | Icon | Badge |
| ---------------- | ------------------------ | ------- | ----- | ---- | ----- |
| `StatsDashboard` | `navigation.label-stats` | `admin` | 57    | yes  | —     |

## Libraries

**Mermaid** (`mermaid`), for the charts — see [above](#charts-mermaid-and-why-no-chart-library).
It was weighed against Chart.js and ECharts: both are fine, and either would add a dependency and a
canvas that needs its own accessibility story. Mermaid adds none, at the price of tooltips and zoom.

Nothing else. CSV is a forty-line helper (`domain/csv.ts`), because its only edge case is the
formula guard and a library would not remove the need to test it.

## Files

| File                                | What it is                                                                                       | Explained in                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `components/ChartWithTable.vue`     | One chart block: the Mermaid picture, a table toggle and a CSV of the same data.                 | [read](../theory/layers.md)           |
| `components/MermaidChart.vue`       | Draws Mermaid source as an inline SVG; the library loads only when a chart mounts.               | [read](../theory/layers.md)           |
| `components/OperationsSection.vue`  | How the shop is running: payment mix, cancellation and return rates, customers, what is waiting. | [read](../theory/layers.md)           |
| `components/ProductsSection.vue`    | Top products and sales by category, each product linking to its own page.                        | [read](../theory/layers.md)           |
| `components/SalesSection.vue`       | The sales block, one group per currency: headline cards, series and the revenue table.           | [read](../theory/layers.md)           |
| `components/StatsPeriodForm.vue`    | The period picker every stats page opens with; reports only a period the API accepts.            | [read](../theory/layers.md)           |
| `domain/calendar.ts`                | Calendar days as `YYYY-MM-DD` strings and their arithmetic.                                      | [read](../theory/domain-layer.md)     |
| `domain/chart.ts`                   | The one shape every chart, table and CSV is built from.                                          | [read](../theory/domain-layer.md)     |
| `domain/csv.ts`                     | Client-side CSV with the spreadsheet formula guard.                                              | [read](../theory/domain-layer.md)     |
| `domain/figures.ts`                 | Small pure rules over the figures the API returns.                                               | [read](../theory/domain-layer.md)     |
| `domain/index.ts`                   | The domain barrel: periods, figures, charts and CSV.                                             | [read](../theory/domain-layer.md)     |
| `domain/mermaid.ts`                 | Chart data to Mermaid text, every label reduced to a plain allow-list.                           | [read](../theory/domain-layer.md)     |
| `domain/period.ts`                  | The period a page asks about and the rules the API enforces on it.                               | [read](../theory/domain-layer.md)     |
| `locales/en.json · locales/it.json` | This domain's translation dictionary for one language, loaded as its own chunk.                  | [read](../tools/i18n.md)              |
| `module.ts`                         | The manifest: routes, navigation entry, response schemas and locales.                            | [read](../theory/modules.md)          |
| `response-schemas.ts`               | One row per endpoint this domain calls, with the Zod schema its response is validated against.   | [read](../api/openapi-workflow.md)    |
| `routes.ts`                         | Two admin routes, lazy-loaded so the chart library downloads only when one opens.                | [read](../theory/modules.md)          |
| `store.ts`                          | The Pinia store: the last answer of each read, with no cache across periods.                     | [read](../tools/state-and-routing.md) |
| `tests/*.spec.ts`                   | Vitest suites: the store, routes, views, sections, period form, chart and domain rules.          | [read](../tools/unit-testing.md)      |
| `tests/e2e/*.cy.ts`                 | Cypress: an axe sweep, the dashboard, the actions and the role gates in a browser.               | [read](../tools/component-testing.md) |
| `views/StatsDashboard.vue`          | A routed screen: one period form over four blocks.                                               | [read](../theory/layers.md)           |
| `views/StatsProductSales.vue`       | A routed screen: one product's sales over time.                                                  | [read](../theory/layers.md)           |

## Working on it

```bash
# this module's vitest suites
npm run test:unit -- stats

# after the backend changes a stats endpoint
npm run regenerate
```

## Related pages

- [`orders`](./orders.md) — the staff list a product's sales page links to
- [`products`](./products.md) — the product pages the dashboard links into
- [Domain Layer](../theory/domain-layer.md) — why the period and CSV rules are pure
- [Sitemap & Access Control](../theory/sitemap.md) — the `read:Stats` gate on these routes
