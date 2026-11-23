---
type: concept
audience: [developer]
---

# wishlist

::: tip At a glance
**Owns** — the visitor's saved products, and the move-to-cart exit.
**Depends on** — [`cart`](./cart.md), so the header badge cannot lag a write this module started, and [`products`](./products.md), for the titles of its saved lines.
**Breaks if you change** — the refresh after move-to-cart. It is the only reason the edge exists.
:::

| Fact          | This module                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| **Subdomain** | `supporting` — Specific to this business but not a differentiator. Kept plain. |
| **Publishes** | —                                                                              |

## Its neighbourhood

The context map is drawn once, in [the whole map](./start.md#the-whole-map).

- → `products` **conformist** — Joins its saved lines to their product records (`useProductLines`), read as they are.
- → `cart` **customer-supplier** — Move-to-cart calls a wishlist endpoint and then asks the cart store to refetch itself; the cart is never asked to write.

## The story

One screen, one store, product references and nothing else. Read it next to
[`cart`](./cart.md): the same shape, without the checkout.

The interesting line is a single call. Move-to-cart is a **wishlist** endpoint; once it answers,
this store asks the cart to **refetch itself** through the cart barrel, so the header's badge cannot
lag a write this module initiated. That one call is the whole of the `wishlist → cart` edge: the cart is asked to read again, never
to write.

::: tip Why this is a line and not a loop
The reverse arrows do not exist. The cart never reads the wishlist, and the product page never
imports it. That is what keeps `wishlist → cart → products` a chain rather than a cycle — and a
cycle would crash
`npm run lint` outright, from `assertAcyclicModuleEdges`'s whole-graph walk in `eslint.config.ts`,
rather than surface on the first navigation with a blank screen.
:::

The heart on the product page is contributed by this module's manifest to the `product-actions`
slot [`products`](./products.md) owns (`components/WishlistToggle.vue`), so the page never imports
this module.

## Line availability

Each saved line arrives as `{ productId }` only. What the product can do comes from the one
availability store (`availability.ts` in `products`), filled for the whole list through the
`availability-watch` slot (the batch read, 100 ids a call), and the page words it with the products
module's labels: "Sold out", "Not available right now", "No longer available", and "Preorder ·
ships {date}" (blue) for a product sold before its release date. "Move to cart" is
disabled only for a removed product. A move that adds nothing (sold out, off sale, or the cart
already holds all that can be bought) answers the wishlist with `warnings[]`: the line stays saved
and a warning toast says so. A wishlist line holds no quantity, so it is never "Only {n} available".

## State

State, getters and actions are exactly what the setup function of each store returns: `src/modules/wishlist/store.ts`.

## Screens

Paths, route names, access and permission per screen: `src/modules/wishlist/routes.ts`; every module's together are in the generated [sitemap](../understand/sitemap.md).

## Wiring

#### Endpoints called

Method, path pattern, response schema and owning module of every operation: `contracts/rest.generated/routes.ts` (rows with `module: "wishlist"`). Auth is in the backend contract.

#### Navigation entries

Entries are declared in `src/modules/wishlist/module.ts`.

## Files

The folder is `src/modules/wishlist/`; each file's own `@module` header says what it is.

## Working on it

```bash
# this module's vitest suites
npm run test:unit -- wishlist

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/wishlist/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

Nothing in this domain needs a page of its own — the story above is the whole of it.

## Related pages

- [`cart`](./cart.md) — the same shape, with the hard part attached
- [`products`](./products.md) — where the heart lives
- [Modules](../understand/modules.md) — the DAG rule and what enforces it
- [State & Routing](../understand/state-and-routing.md) — the store behind the screen
