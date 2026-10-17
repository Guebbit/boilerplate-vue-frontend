---
source: src/modules/payments/routes.ts
sha256: ace27ca2dca48f4ee7fb62676bd55e0fac60d7664898c83bbf9adf4173dac180
generated_at: 2026-10-17T01:23:44.899332+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/routes.ts

## Purpose

Declares the Vue Router route table for the payments domain. The payments module exposes exactly one staff-facing page (the payments list); there is no dedicated "pay" route because paying is a panel on the order view, not a standalone page.

## Key elements

- **Default export** — an array satisfying `RouteRecordRaw[]` with a single entry:
  - **`PaymentsList`** (`/sales/payments`) — lazy-loads `./views/PaymentsList.vue`. Requires `auth` access and the `display:Payment` permission. Title is resolved via the i18n key `payments-list-page.page-title`.

## Relationships

- **`src/modules/payments/module.ts`** — imports this route array and registers it with the router for the payments module.
- **`src/modules/payments/tests/routes.spec.ts`** — asserts the shape, path, meta, and permission configuration of the exported routes.

## Notes

- The permission is `display:Payment`, **not** `read:Payment`. Per the inline comment, `read:Payment` is a capability check (`can`) for a customer-level operation, whereas `display:Payment` is what gates access to this staff page. Do not substitute one for the other.
- The route is the *only* entry in the array; there is intentionally no per-payment detail route. If a new payment sub-view is needed, it should be added as a nested or sibling route here rather than as a panel component imported elsewhere.
