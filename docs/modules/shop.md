---
type: concept
audience: [developer]
---

# shop

::: tip At a glance
**Owns** — the shop's commerce settings, read once from `GET /shop`: currency, decimal places, ship-to countries, backorder promise and time zone.
**Depends on** — nothing. `cart`, `delivery`, `orders` and `products` read it through the barrel.
**Breaks if you change** — the barrel's readers (`shopCurrency`, `shipToCountries`, `backorderPromiseDays`, `loadShop`). Four modules import them.
:::

| Fact          | This module               |
| ------------- | ------------------------- |
| **Subdomain** | `supporting`              |
| **Publishes** | the readers in `index.ts` |

## The story

The module loads the shop's settings from its own `setup` at boot, and holds them in refs that are
empty until known: a price label never guesses a currency. A failed read is logged and retried by
the next reader.

Who runs the site is not here. The operator's legal identity and the Terms version come from
`GET /config` (`src/infrastructure/config.ts`), which the core reads, so the footer, the Terms, the
Legal notice and the Privacy pages work with this module removed (`npm run demo:remove`).
