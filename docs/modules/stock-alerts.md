# stock-alerts

::: tip At a glance
**Owns** — the "Notify me" button where a product cannot be ordered, and the account list of open requests.
**Depends on** — [`products`](./products.md), for the shelf state that decides when the button is offered and for the titles of its list.
**Breaks if you change** — the `product-actions` slot contribution. It is the only way the button reaches the product page and card.
:::

| Fact          | This module                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| **Subdomain** | `supporting` — Specific to this business but not a differentiator. Kept plain. |
| **Publishes** | —                                                                              |

## Its neighbourhood

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

State, getters and actions are exactly what the setup function of each store returns: `src/modules/stock-alerts/store.ts`.

Every action replaces `items` with what the API answered, so the "you'll be told" state cannot
disagree with the server.

## Screens

Paths, route names, access and permission per screen: `src/modules/stock-alerts/routes.ts`; every module's together are in the generated [sitemap](../theory/sitemap.md).

## Wiring

#### Endpoints called

Method, path pattern, response schema and owning module of every operation: `contracts/rest.generated/routes.ts` (rows with `module: "stock-alerts"`). Auth is in the backend contract.

#### Slot contributions

| Slot              | Component                                      | Owner                       |
| ----------------- | ---------------------------------------------- | --------------------------- |
| `product-actions` | `components/NotifyMeButton.vue`, loaded lazily | [`products`](./products.md) |

#### Navigation entries

Entries are declared in `src/modules/stock-alerts/module.ts`.

## Files

The folder is `src/modules/stock-alerts/`; each file's own `@module` header says what it is.

## Working on it

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
