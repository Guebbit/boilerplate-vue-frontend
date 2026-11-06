# stock-alerts

::: tip At a glance
**Owns** — the "Notify me" button where a product cannot be ordered, and the account list of open requests.
**Depends on** — [`products`](./products.md), for the shelf state that decides when the button is offered and for the titles of its list.
**Breaks if you change** — the `product-actions` slot contribution. It is the only way the button reaches the product page and card.
:::

| Fact                    | This module                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Subdomain**           | `supporting` — Specific to this business but not a differentiator. Kept plain. |
| **Screens**             | 1 — `StockAlerts`                                                              |
| **Store**               | `stock-alerts`                                                                 |
| **Menu entries**        | `StockAlerts`                                                                  |
| **API calls**           | 3                                                                              |
| **Depends on**          | [`products`](./products.md)                                                    |
| **Depended on by**      | —                                                                              |
| **Languages**           | `en` · `it`                                                                    |
| **Publishes**           | —                                                                              |
| **Backend counterpart** | `stock-alerts` in `boilerplate-node-backend`                                   |

## The map

The context map is drawn once, in [the whole map](./index.md#the-whole-map).

- → `products` **conformist** — Reads the product's shelf state (`shelfStateOf`) to know when the button is offered, and its titles (`useProductLines`) for the list.

## The story

A sold-out page with no way to say "tell me" is a missing standard feature. The button is offered
to a signed-in shopper only while the product cannot be ordered (sold out, or off sale); once asked
it reads "You'll be told", and a second click cancels. The backend sends one mail and one inbox row
when the product can be ordered again, then forgets the request.

The button is contributed by this module's manifest to the `product-actions` slot
[`products`](./products.md) owns (`components/NotifyMeButton.vue`), so the page and the card never
import it, the same way the wishlist's heart reaches them.

## State

Store `stock-alerts`, from `store.ts`. Only what the setup function returns is listed.

| Kind        | Members                                                     |
| ----------- | ----------------------------------------------------------- |
| **State**   | `items`                                                     |
| **Getters** | `isAsked` · `loading`                                       |
| **Actions** | `fetchStockAlerts` · `ensureStockAlerts` · `ask` · `cancel` |

Every action replaces `items` with what the API answered, so the "you'll be told" state cannot
disagree with the server.

## Screens

| Path           | Route name    | Access | Permission | View                    |
| -------------- | ------------- | ------ | ---------- | ----------------------- |
| `stock-alerts` | `StockAlerts` | `auth` | —          | `views/StockAlerts.vue` |

Paths are relative to the localised root, so `cart` is served at `/:locale/cart`. **Access** is the route's own `meta.access` (the standing it needs) and **Permission** its `meta.can`.

## Wiring

#### Endpoints called

| Call                        | Response schema            |
| --------------------------- | -------------------------- |
| `GET /stock-alerts`         | `ListStockAlertsResponse`  |
| `POST /stock-alerts`        | `CreateStockAlertResponse` |
| `DELETE /stock-alerts/{id}` | `DeleteStockAlertResponse` |

Each row registers one Zod schema through the manifest, so enabling the domain turns its contract validation on and deleting the folder turns it off.

#### Slot contributions

| Slot              | Component                                      | Owner                       |
| ----------------- | ---------------------------------------------- | --------------------------- |
| `product-actions` | `components/NotifyMeButton.vue`, loaded lazily | [`products`](./products.md) |

#### Navigation entries

| Route         | Label key                       | Section   | Order | Icon | Badge |
| ------------- | ------------------------------- | --------- | ----- | ---- | ----- |
| `StockAlerts` | `navigation.label-stock-alerts` | `account` | 76    | yes  | —     |

## Files

| File                                                   | What it is                                                                                     | Explained in                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| `components/NotifyMeButton.vue`                        | The "Notify me" button contributed to the product page and card through a slot.                | [read](../theory/layers.md)           |
| `locales/en.json · locales/it.json`                    | This domain's translation dictionary for one language, loaded as its own chunk.                | [read](../tools/i18n.md)              |
| `module.ts`                                            | The manifest: route, navigation entry, slot contribution, response schemas and locales.        | [read](../theory/modules.md)          |
| `response-schemas.ts`                                  | One row per endpoint this domain calls, with the Zod schema its response is validated against. | [read](../api/openapi-workflow.md)    |
| `routes.ts`                                            | The one authenticated account page.                                                            | [read](../theory/modules.md)          |
| `store.ts`                                             | The Pinia store: the shopper's open requests, replaced wholesale by every answer.              | [read](../tools/state-and-routing.md) |
| `tests/notify-me-button.spec.ts · tests/store.spec.ts` | Vitest suites: the button's states and the store with the transport mocked.                    | [read](../tools/unit-testing.md)      |
| `tests/e2e/a11y.cy.ts · tests/e2e/actions.cy.ts`       | Cypress: an axe sweep over the route, and ask and cancel in a browser.                         | [read](../tools/component-testing.md) |
| `views/StockAlerts.vue`                                | A routed screen: the shopper's open requests, each cancellable.                                | [read](../theory/layers.md)           |

## Working on it

| Suite   | Files | Where                                 |
| ------- | ----- | ------------------------------------- |
| Vitest  | 2     | `src/modules/stock-alerts/tests/`     |
| Cypress | 2     | `src/modules/stock-alerts/tests/e2e/` |

```bash
# this module's vitest suites
npm run test:unit -- stock-alerts

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/stock-alerts/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

Nothing in this domain needs a page of its own: the story above is the whole of it.

## Related pages

- [`wishlist`](./wishlist.md) — the same slot, the same shape
- [`products`](./products.md) — owns the slot and the shelf state
