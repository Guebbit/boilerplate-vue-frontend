---
source: src/modules/shop/index.ts
sha256: e828021b20eff83bc9b2d8d424134ec2ab4a1b5d5d26732914045e3197b1056f
signature: e828021b20eff83bc9b2d8d424134ec2ab4a1b5d5d26732914045e3197b1056f
generated_at: 2026-11-10T05:44:35.056067+00:00
model: ollama:qwen3.8:27b
---

# src/modules/shop/index.ts

## Purpose

Public barrel for the shop module. It re-exports the module's commerce settings (currency, ship-to countries, backorder promise) so that sibling modules (`cart`, `delivery`, `orders`, `products`) can consume them without importing the internal implementation file directly.

## Key elements

- **`loadShop`** — Loads shop settings (backed by `GET /shop`).
- **`shopCurrency`** — The shop's currency code.
- **`shopMinorUnits`** — Minor-unit exponent for that currency.
- **`shipToCountries`** — List of countries the shop ships to.
- **`backorderPromiseDays`** — Days promised for backorder fulfilment.

All five are pure re-exports from `./shop`; no logic lives here.

## Relationships

- **`src/modules/shop/shop.ts`** — The sole upstream dependency. This barrel is a 1-to-1 re-export of those five named exports; nothing else is imported or wrapped.
- Downstream consumers (`cart`, `delivery`, `orders`, `products`) import from this file rather than from `./shop` directly.

## Notes

- Internal files *within* the shop module import `./shop` directly, bypassing this barrel. Importing this barrel from inside the module would create a circular path and should be avoided.
- Because the barrel only re-exports, adding or removing a symbol here without updating `./shop` (or vice-versa) will produce a build error. Keep the two lists in lockstep.
