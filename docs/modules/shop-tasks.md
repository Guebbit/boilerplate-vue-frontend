# shop-tasks

::: tip At a glance
**Owns** — the words and links of the shop's notification codes (`shop-tasks.*`, in `notices.ts`), the shop's half of the `task-kind`, `task-category` and `task-link` labels, and the feed of the staff nav badges.
**Depends on** — nothing it imports. It declares `AppModule.notices` entries; the foundation's bell asks the registry and names no shop code.
**Breaks if you change** — the `shop-tasks.*` codes and their `params` (the contract's union). A code this build has no entry for reads as a generic notification.
:::

| Fact          | This module  |
| ------------- | ------------ |
| **Subdomain** | `supporting` |
| **Publishes** | —            |

## Its neighbourhood

`shop-tasks` imports no sibling. Its links name sibling routes (`OrderTarget`, `UserTarget`,
`ReturnTarget`, `SalesOrders`, `PaymentsList`, `SalesReturns`, `PreordersBoard`,
`InventoryLedger`); the bell binds a link only when this build ships that route, so removing a
sibling removes the link and nothing else. No `dependsOn` entry is needed: there is no import
to permit.

## The story

The foundation ships a bell and a to-do inbox that know no shop. This module is what a shop adds:
the sentences of its buyer notices, the screens its staff summaries open, and the labels of its
task kinds.

```mermaid
flowchart LR
    S["server row<br/>shop-tasks.* code"] --> I["inbox store (notifications)"]
    I -->|"noticeOf(code)"| R["registry<br/>AppModule.notices"]
    R --> N["shop-tasks/notices.ts"]
    N -->|"describe"| T["sentence"]
    N -->|"target"| L["useNotificationLink<br/>route or path"]
    S -->|"summary rows: params.work"| N
```

### The text

Three shapes of notice:

| Shape           | Codes                                                                                                | Links to                               |
| --------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Buyer           | `cart-line-removed`, `cart-merge-refused`                                                            | `Cart`                                 |
| Buyer           | `wishlist-item-removed`                                                                              | `Wishlist`                             |
| Buyer           | `stock-alert`                                                                                        | `ProductTarget`, buyable when it fires |
| Buyer, an order | `fulfillment-delayed`, `fulfillment-held`, `shipment-lost`                                           | `OrderTarget`, where they can cancel   |
| Staff record    | `staff.purchase-hold-placed`, `staff.return-requested`                                               | `UserTarget`, `ReturnTarget`           |
| Staff summary   | the `staff.*` summary codes (`transfers-due`, `preorders-late`, `low-stock`, ...) carrying a `count` | the list they count                    |

The shop's codes, and who is told of each, are on the backend's
[shop-tasks page](https://github.com/Guebbit/boilerplate-node-backend/blob/main/docs/modules/shop-tasks.md#the-notices).

A summary row carries a count and no id, so it points at a list. Which filtered list is the
backend's choice, written once in `staffPages:` of `contracts/frontend-links.yaml` and sent in the
row's `params.work`; the bell opens it as a path, and the digest mail links the same one. `tests/unit/app/router/frontend-links.spec.ts` checks
that each list still reads the query keys those paths set.

A product's name comes from `params.titles`, a map of locale to name copied in when the
notification was written, because the notification outlives the product:

| Order | Name used                                             |
| ----- | ----------------------------------------------------- |
| 1     | The reader's current language                         |
| 2     | The shop's main language (vue-i18n's fallback locale) |
| 3     | Any name there is                                     |
| 4     | "a product", when `titles` is empty                   |

The late-preorder, hold and lost-parcel sentences compose several dictionary entries (the date, a
missing date, the shop's own message line); they are written out as literal keys in `describe.ts`
so the unused-key audit sees them.

### The nav badges

A staff nav badge counts open work (what a person still has to do on that screen), not unread
notices, so opening the bell never empties it. The backend answers every shop count in one read,
`GET /shop-tasks/summary` (key names: `ShopWorkSummary` in the contract, and nowhere else). This
module writes them into `@/kernel/work-counts`; the manifests of `orders`, `payments`, `returns`
and `inventory` (two entries) read their own key there, so none of them imports this module. A key
the caller may not open is absent, and its badge shows nothing.

`users` and `webhooks` are foundation modules and name no shop code: each wears its own list's
total (`purchaseHoldReview=true` with `deleted=false`; `autoDisabled=true`) through its own
composable. Tasks keeps `GET /tasks/summary`.

All of them re-read on the same triggers (`kernel/use-badge-refresh.ts`):

| Trigger                                  | Read                                            |
| ---------------------------------------- | ----------------------------------------------- |
| a person signs in, or another takes over | forced                                          |
| a staff notice reaches the bell          | forced                                          |
| the route changes                        | normal: served from the last answer inside 60 s |
| the tab becomes visible                  | normal: served from the last answer inside 60 s |
| sign-out, or no right to see the badge   | counts cleared, nothing read                    |

There is no timer. The 60 s window is the toolkit's `fetchAny` `staleTime`, not a hand-rolled
throttle. A failed read keeps the last number and warns once until a read succeeds again. Every
read is passive: it must not keep a staff session from idling out.

```mermaid
flowchart LR
    T["triggers<br/>(sign-in, staff notice,<br/>route, tab visible)"] --> F["shop-tasks feed<br/>useShopWorkFeed"]
    F -->|"fetchAny, key + 60 s"| API["GET /shop-tasks/summary"]
    API --> K["@/kernel/work-counts"]
    K --> O["orders / payments / returns<br/>/ inventory badges"]
    T --> U["users, webhooks<br/>own list totals"]
```

### Task labels

`task-kind.*`, `task-category.*` and `task-link.*` are co-owned namespaces, one key per contract
value. This module owns the shop's values (the ones in `locales/*.json` under those namespaces); the
foundation's are in [`tasks`](./tasks.md). The values themselves are the contract's `TaskKind`,
`TaskCategory` and `TaskLinkType` enums.

## Files

The folder is `src/modules/shop-tasks/`; each file's own `@module` header says what it is.

## Libraries

None.

## Working on it

```bash
# this module's vitest suite
npm run test:unit -- shop-tasks

# after the backend changes a code or the summary screens
npm run regenerate
```

## Related pages

- [`notifications`](./notifications.md) — the bell and the registry that read these entries
- [`tasks`](./tasks.md) — the to-do inbox and the foundation's half of the labels
- [Sitemap](../theory/sitemap.md#navigation-sections) — where a nav entry, and its badge, sit
- [Shared rules](../tools/shared-rules.md) — how the YAML becomes the generated map
