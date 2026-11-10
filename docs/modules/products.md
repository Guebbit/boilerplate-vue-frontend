# products

::: tip At a glance
**Owns** — the catalogue screens: the list (storefront grid for shoppers, table for staff) and detail, admin create and edit.
**Depends on** — the backend modules whose API it calls: [`locales`](./locales.md), [`delivery`](./delivery.md) and [`shop`](./shop.md) (`module.yaml` `dependsOn`). [`cart`](./cart.md) and [`wishlist`](./wishlist.md) depend on it, and put their buttons on the product page through the `product-actions` slot.
**Breaks if you change** — the shape of `useProductLines`, `shelfStateOf` or `invalidateProductsCache`. [`cart`](./cart.md), [`wishlist`](./wishlist.md), [`inventory`](./inventory.md) and [`stock-alerts`](./stock-alerts.md) call them.
:::

| Fact          | This module                                                              |
| ------------- | ------------------------------------------------------------------------ |
| **Subdomain** | `core` — The reason the product exists. Worth its own client-side rules. |
| **Publishes** | `useProductLines` · `shelfStateOf` · `invalidateProductsCache`           |

## The map

The context map is drawn once, in [the whole map](./index.md#the-whole-map).

- `inventory` → **customer-supplier** — Asks the products store to drop its cached catalogue after a recorded movement (`invalidateProductsCache`), and reads the ledger's titles through `useProductLines`.
- `cart` → **customer-supplier** — Reads its lines' products through `useProductLines` and asks the cache to drop after a checkout (`invalidateProductsCache`).
- `wishlist` → **conformist** — Joins its saved lines to their product records through `useProductLines`, read as they are.
- `stock-alerts` → **conformist** — Reads the shelf state (`shelfStateOf`) and the titles (`useProductLines`) as they are.

## The story

The catalogue is the supplier the shop's other screens read. Four screens, one store, and no
arrows out: the two buttons on a product page — **add to cart** and **the heart** — are not
imported here. The page renders a `product-actions` slot (`src/kernel/slots.ts`) and
[`cart`](./cart.md) and [`wishlist`](./wishlist.md) each contribute their button from their own
manifest, so this module never learns either exists.

What it publishes for them is `fetchProductsByIds`, behind `useProductLines`: one batched
`POST /products/search` for a set of id-only lines, landing in the same dictionary the product
page reads.

::: tip What it publishes
The barrel offers narrow handles on the store, never the store: `useProductLines` joins id-only
lines to their records, `shelfStateOf` ranks the flags the API sent into one badge, and
`invalidateProductsCache` drops the cached catalogue after a stock-moving write. Specs seed the
dictionary through `src/modules/products/tests/products-store.ts`, so no production sibling holds the store.
:::

## How fresh the numbers are

Products are cached for **five minutes** (`staleTime` in `store.ts`), and an expired entry keeps
rendering while the refetch runs. That window is the lists': a stock count a few minutes old on a
grid is fine, because the server checks stock again at add-to-cart and at checkout.

The **product page** does not wait for it. `ProductTarget.vue` watches its record with `staleTime: 0`, so
every open renders the cached copy at once and swaps the fresh one in (stale-while-revalidate, the
default behaviour of the query library the toolkit sits on). The shopper's own cart and checkout
writes also end the window early, through `invalidateProductsCache` — the one handle `cart` reaches
through the barrel.

```mermaid
flowchart LR
    L["List read<br/>(5-minute window)"] --> C[("products cache")]
    P["Product page opens"] -->|"staleTime 0: refetch"| C
    W["Cart or checkout write"] -->|"invalidateProductsCache"| C
    C -->|"cached copy at once,<br/>fresh copy swapped in"| V["What the shopper sees"]
```

## The list is two presentations

The catalogue is public, but what a viewer may do decides how it is shown: staff (anyone holding
`create`, `update` or `delete` on `Product`) get the `DataTable` with its row actions and the
by-id filter; everyone else, guests included, gets a **storefront grid** of `ProductCard`s. A card
is an `<article>`: picture, the title as its one link, price, availability, and whatever the
`product-actions` slot carries — the same slot the product page hosts, so the grid learns nothing
about the cart. Each row button, and the product page's Edit button, reads the server's `actions`
flag on the product (`update`, `delete`, `restore`, `hardDelete`) rather than the caller's keys.

```mermaid
flowchart TD
    V["/products"] --> S{"holds create, update or delete on Product?"}
    S -->|yes| T["DataTable + row actions<br/>header sort"]
    S -->|no| G["ProductCard grid<br/>Sort by select"]
    T --> F["filters.sort"]
    G --> F
    F -->|"?sort=-price"| A["POST /products/search { sort: ['-price'] }"]
```

Both write the same `filters.sort` (the API's CSV, so it lives in the URL) through
`useServerSort`, and both re-search from page 1: the server sorts the whole catalogue, never the
page the browser holds. See [`sorting`](https://github.com/Guebbit/boilerplate-node-backend/blob/main/docs/api/sorting.md)
in the backend for the grammar and the per-resource whitelist.

`products/create` is declared before `products/:id` in `routes.ts`. vue-router ranks a static
segment above a dynamic one regardless of order, so `create` could never be swallowed as an id —
but the users routes read the same way, and a reader should not have to know the ranking rules to
be sure.

Stock is read-only here. `onHand`, `reserved` and `available` arrive serialized on every product,
and no form on these screens writes them: changing stock is an [`inventory`](./inventory.md)
operation.

## Product states on screen

The backend keeps two independent flags, `active` (can a shopper see it) and `purchasable` (can it
be bought, stock aside), and derives a third, read-only one, `preorder` (on sale, with a
`releaseDate` still ahead). The screens rank them in one place, `src/modules/products/domain/shelf-state.ts`, so the card, the
product page and the add-to-cart button never disagree: **off sale outranks a preorder, which outranks the stock badge**.

| `purchasable` | `preorder` | `inStock` | Shelf state    | Card badge                | Add to cart                         |
| ------------- | ---------- | --------- | -------------- | ------------------------- | ----------------------------------- |
| `false`       | any        | any       | `off-sale`     | "Not available right now" | disabled, "Not available right now" |
| `true`        | `true`     | any       | `preorder`     | "Preorder · ships {date}" | enabled, "Preorder"                 |
| `true`        | `false`    | `false`   | `out-of-stock` | "Out of stock"            | disabled, "Out of stock"            |
| `true`        | `false`    | `true`    | `in-stock`     | "In stock"                | enabled                             |

```mermaid
flowchart TD
    A[product] --> B{purchasable false?}
    B -- yes --> C[off-sale]
    B -- no --> D{preorder true?}
    D -- yes --> E[preorder: buyable now, ships from releaseDate]
    D -- no --> F{inStock?}
    F -- yes --> G[in-stock]
    F -- no --> H[out-of-stock]
```

A preorder's shelf may be empty: its units are claimed against the preorder allowance
(`backorderLimit`, set on the [stock board](./inventory.md)), not the shelf, so `inStock` is not
asked. The shopper never sees the allowance; a full one shows up as "Sold out" on the cart line.

Staff set the date with the "Release date" field on the create and edit forms
(`<input type="date">`, sent as the plain `YYYY-MM-DD` day; at most one year ahead, which the
server enforces). The day is the shop's: the server stores the UTC instant of its midnight in the
shop's zone and sends the same day back, so the form fills the field from the response as it is and
no screen does zone maths. Every place that prints a promise date (`releaseDate`, `restockDate`,
`agreedAt`, `expectedAt`, `firstAgreedAt`, an order line's `promisedAt` and the timeline's moved-date rows) uses `formatDay`, which prints the day with no
time and no shift in any browser zone. An edit sends it only when it changed: moving it later notifies the buyers who
already paid, so an untouched date must not travel. Clearing the field sends `null` and ends the
preorder.

A hidden product is a 404 for a shopper, so there is nothing to rank: a cart or wishlist line that
points at one reads "No longer available" (see [cart](./cart.md#a-product-that-is-gone)). Staff
edit the flag with the "On sale" switch on the create and edit forms; the admin list has a column
and a "Sale status" filter beside `active`.

## State

State, getters and actions are exactly what the setup function of each store returns: `src/modules/products/store.ts`.

## Screens

Paths, route names, access and permission per screen: `src/modules/products/routes.ts`; every module's together are in the generated [sitemap](../theory/sitemap.md).

### Saving a later or cleared release date

A moved release date notifies the buyers who already paid (see the backend's
`delivery` page, "Preorders and a moved date"). So the edit form asks first, through
`src/modules/products/composables/use-release-date-confirm.ts`:

```mermaid
flowchart TD
    A[Save pressed] --> B{Date later or cleared?}
    B -- no --> S[Save]
    B -- yes --> C{Can display Order?}
    C -- no --> S
    C -- yes --> D[GET /delivery/fulfillment-orders/release-date-impact]
    D -- failed --> S
    D -- ok --> E{notify = 0?}
    E -- yes --> S
    E -- no --> F[Confirm dialog: how many orders get an email]
    F -- Save --> S
    F -- Back --> X[Nothing saved]
```

The dialog informs and never refuses. A cleared date sends no `releaseDate`, which the backend reads
as cleared. The ability is checked before the call, since a call the visitor may not make is logged
on the server as a forbidden one.

## Wiring

#### Endpoints called

Method, path pattern, response schema and owning module of every operation: `contracts/rest/routes.ts` (rows with `module: "products"`). Auth is in the backend contract.

#### Navigation entries

Entries are declared in `src/modules/products/module.ts`.

## Files

The folder is `src/modules/products/`; each file's own `@module` header says what it is.

## Working on it

```bash
# this module's vitest suites
npm run test:unit -- products

# this module's cypress suites
npm run test:e2e -- --spec 'src/modules/products/tests/e2e/*.cy.ts'

# after the backend changes an endpoint this module calls
npm run regenerate
```

## Deeper in

Nothing in this domain needs a page of its own — the story above is the whole of it.

## Related pages

- [Modules overview](./index.md) — the whole context map
- [`cart`](./cart.md) · [`wishlist`](./wishlist.md) — the modules that contribute the product page's buttons
- [State & Routing](../tools/state-and-routing.md) — what a store is and how a view reads one
- [Sitemap & Access Control](../theory/sitemap.md) — every screen in the app, and who may reach it
- [OpenAPI Workflow](../api/openapi-workflow.md) — where the generated client and Zod schemas come from
