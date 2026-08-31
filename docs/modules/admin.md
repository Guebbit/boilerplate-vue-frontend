# admin

::: tip At a glance
**Owns** — the observability console: service health, KPIs and the audit log.
**Depends on** — nothing. It reads the observability endpoints directly.
**Breaks if you change** — nothing outside this folder. It is designed to be deleted.
:::

| Fact                    | This module                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Subdomain**           | `generic` — A solved problem. Modelling effort here would be waste.                                                                                                                                                              |
| **Screens**             | 1 — `Admin`                                                                                                                                                                                                                      |
| **Store**               | _none_ — holds no state of its own                                                                                                                                                                                               |
| **Menu entries**        | `Admin`                                                                                                                                                                                                                          |
| **API calls**           | 5                                                                                                                                                                                                                                |
| **Depends on**          | _nothing_                                                                                                                                                                                                                        |
| **Depended on by**      | _nothing_                                                                                                                                                                                                                        |
| **Languages**           | `en` · `it`                                                                                                                                                                                                                      |
| **Publishes**           | _nothing_ — no barrel, so no sibling may import it                                                                                                                                                                               |
| **Backend counterpart** | `observability` + `audit-logs` in `boilerplate-node-backend` — The dashboard is one screen over two backend domains: `observability` serves health and the metrics overview, `audit-logs` owns the trail behind its audit table. |

::: info Stands alone
No module depends on this one and it depends on none. Deleting the folder and its line in `src/modules.ts` costs nothing else.
:::

## The map

`admin` sits on no edge of the context map — nothing imports it and it imports nothing.

## The story

One screen over **two backend modules**, which makes this the clearest asymmetry in the pairing
table: `observability` serves health and the metrics overview, `audit-logs` owns the trail behind the
audit table. Neither has a frontend module of its own, and this one has no backend module of its own.

It depends on nothing, and reads the observability endpoints directly rather than through any other
domain's store.

::: tip That is deliberate, and the reason is blunt
**This is the first thing a downstream project without an ops dashboard deletes.** So it was built to
cost nothing on the way out: `rm -rf` the folder, drop one line of `src/modules.ts`, and nothing else
in the client notices.

A console that reached into three domains' stores to render its KPIs would not have that property.
:::

`types.ts` exists here and in no other module: the dashboard assembles shapes that no single
endpoint answers with, and those live beside the composable that builds them rather than in the
generated types, which only describe what the API actually returns.

The audit table is a read of somebody else's collection, and this client never writes to it. Every
row it shows was written server-side by a module that had no idea a dashboard existed.

## State

This module owns no store. Whatever state its screens read belongs to a module it depends on, or to the app-wide stores in `src/infrastructure/`.

## Screens

| Path    | Route name | Access  | View              |
| ------- | ---------- | ------- | ----------------- |
| `admin` | `Admin`    | `admin` | `views/Admin.vue` |

Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route’s own `meta.access` — a menu entry never restates it, which is what keeps the menu and the router from disagreeing.

## Wiring

#### Endpoints called

| Call                                  | Response envelope                         |
| ------------------------------------- | ----------------------------------------- |
| `GET /observability/audit`            | `GetObservabilityAuditLogsResponse`       |
| `GET /observability/events`           | `GetObservabilityEventsResponse`          |
| `GET /observability/health`           | `GetObservabilityHealthResponse`          |
| `GET /observability/metrics`          | `GetObservabilityMetricsResponse`         |
| `GET /observability/metrics/overview` | `GetObservabilityMetricsOverviewResponse` |

Each row registers one Zod envelope through the manifest, so enabling the domain turns its contract validation on and deleting the folder turns it off.

#### Navigation entries

| Route   | Label key                | Section | Order | Icon | Badge |
| ------- | ------------------------ | ------- | ----- | ---- | ----- |
| `Admin` | `navigation.label-admin` | `admin` | 40    | yes  | —     |

## Files

| File                                          | What it is                                                                                                                                                  | Explained in                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `components/AdminAuditTab.vue`                | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `components/AdminOverviewTab.vue`             | A component this domain owns. Published through the barrel when a sibling mounts it, internal otherwise.                                                    | [read](../theory/layers.md)           |
| `composables/use-admin-observability.ts`      | Reusable reactive logic for this domain — the tier between a store and a component.                                                                         | [read](../theory/layers.md)           |
| `locales/en.json`                             | This domain’s translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `locales/it.json`                             | This domain’s translation dictionary for one language, loaded as its own chunk.                                                                             | [read](../tools/i18n.md)              |
| `module.ts`                                   | The manifest — the only file the application loads directly. Declares the name, routes, navigation entries, response schemas, dependency edges and locales. | [read](../theory/modules.md)          |
| `response-schemas.ts`                         | One row per endpoint this domain calls, pairing a method and path pattern with the Zod envelope its response is validated against.                          | [read](../api/openapi-workflow.md)    |
| `routes.ts`                                   | The domain’s route records, spliced into the localised route tree. Each carries its own `meta.access`.                                                      | [read](../theory/sitemap.md)          |
| `tests/e2e/__snapshots__/admin-dashboard.png` | A committed visual-regression baseline.                                                                                                                     | [read](../tools/visual-regression.md) |
| `tests/e2e/a11y.cy.ts`                        | Cypress suite — the screens, in a browser.                                                                                                                  | [read](../tools/component-testing.md) |
| `tests/e2e/admin.visual.cy.ts`                | Cypress suite — the screens, in a browser.                                                                                                                  | [read](../tools/component-testing.md) |
| `tests/routes.spec.ts`                        | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `tests/use-admin-observability.spec.ts`       | Vitest suite — the store, the routes and the rules, in isolation.                                                                                           | [read](../tools/unit-testing.md)      |
| `types.ts`                                    | `admin` only. The shapes the dashboard assembles that no endpoint answers with directly.                                                                    | [read](../tools/admin-dashboard.md)   |
| `views/Admin.vue`                             | A routed screen. Reads its store, renders, and holds no fetching logic of its own.                                                                          | [read](../theory/layers.md)           |

## Working on it

| Suite            | Files | Where                                        |
| ---------------- | ----- | -------------------------------------------- |
| Vitest           | 2     | `src/modules/admin/tests/`                   |
| Cypress          | 2     | `src/modules/admin/tests/e2e/`               |
| Visual baselines | 1     | `src/modules/admin/tests/e2e/__snapshots__/` |

```bash
# this module's vitest suites
npm run test:unit -- admin

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/admin/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

- [The dashboard](./admin-dashboard.md)

## Related pages

- [The dashboard](./admin-dashboard.md) — what the console assembles, and from where
- [`realtime`](./realtime.md) — the other consumer of the same backend module
- [Admin Dashboard](../tools/admin-dashboard.md) — the mechanism behind the panels
- [Observability](../tools/observability.md) — what is measured, and by whom
- [Observability Endpoints](../api/observability.md) — the contract for the reads
