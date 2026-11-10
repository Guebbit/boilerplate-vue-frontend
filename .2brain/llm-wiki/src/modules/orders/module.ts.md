---
source: src/modules/orders/module.ts
sha256: 100adb98b31f63077ac2d89bde38e4e62f492821081f73242002460f4da95ec8
signature: 100adb98b31f63077ac2d89bde38e4e62f492821081f73242002460f4da95ec8
generated_at: 2026-11-10T04:59:45.443738+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/module.ts

## Purpose

Module manifest for the **orders** subdomain (`core`). Declares the navigation entries, lazy-loaded response schemas, locale bundles, and the route table so the kernel's `AppModule` registry can mount the customer-facing order history and the admin order-status screens without this file containing any business logic itself.

## Key elements

- **Default export (`AppModule`)** – The single object that registers the module. Uses `satisfies AppModule` for type-checking without widening.
  - `name: 'orders'` – registry key.
  - `loadingKeys: ['orders']` – keys the app waits on before considering the module ready.
  - `routes` – imported from `./routes.ts`; the full route table for the module.
  - `navigation` – two entries:
    - **OrdersList** – customer account section (order 90, `ReceiptText` icon).
    - **SalesOrders** – admin section under `navigation.group-sales` (order 55, `ClipboardList` icon); carries a live badge via `useWorkCount('salesOrders')` showing orders paid but not yet with a carrier.
  - `tours` – three sequential steps of the `order-staff` tour targeting the payment, shipment, and timeline panels on an admin order view.
  - `responseSchemas` – lazy-imports `./response-schemas` and exposes `ordersResponseSchemas`.
  - `locales` – lazy-imports `en.json` and `it.json` through the `dictionary` wrapper.

## Relationships

- **`src/modules/orders/routes.ts`** – Imported and assigned to the `routes` field; this file contributes no route definitions of its own.

## Notes

- No order-status mutation or validation lives here; the file's own comment states that status invariants are enforced behind the API. This file is purely declarative wiring.
- Both navigation entries set `plural: 1`, meaning the i18n label is expected to already be plural-safe (no runtime pluralization).
- The `order` values (90 / 55) control sort position within their respective sections; they are not related to each other.
- A deeper context map is maintained at `docs/modules/orders.md` § "The map" — consult it before assuming this manifest captures the full surface area of the orders subdomain.
