---
source: src/modules/payments/routes.ts
sha256: ace27ca2dca48f4ee7fb62676bd55e0fac60d7664898c83bbf9adf4173dac180
signature: ace27ca2dca48f4ee7fb62676bd55e0fac60d7664898c83bbf9adf4173dac180
generated_at: 2026-11-10T05:12:43.135242+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/routes.ts

## Purpose

Defines the Vue Router route table for the payments domain. It exists to declare the single staff-facing page (the payments list) so that `module.ts` can register it in the application's routing tree. Paying for an order is intentionally **not** a route here — it is a panel on the order page.

## Key elements

- **Default export** — an array satisfying `RouteRecordRaw[]` with one entry:
  - `path: 'sales/payments'`, `name: 'PaymentsList'`
  - `component` — lazy import of `./views/PaymentsList.vue`
  - `meta` — `access: 'auth'`, `can: ['display', 'Payment']`, `title` (i18n key `payments-list-page.page-title`)

## Relationships

- **`src/modules/payments/module.ts`** — imports this route table and registers it with the application router.
- **`src/modules/payments/tests/routes.spec.ts`** — unit-tests the exported route array (paths, names, meta, component resolution).

## Notes

- The permission check uses `display:Payment`, **not** `read:Payment`. Per the inline comment, `read:Payment` governs the `can()` directive for a *customer* resource; only `display:Payment` authorizes opening this staff page.
- The single-route design is deliberate: the domain models "paying" as a panel within the order flow, not as its own navigable route. Adding a `/payments/:id` style route here would contradict that intent.
