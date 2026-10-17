---
source: contracts/rest/operation-modules.ts
sha256: 9539d639cf03d049abb760ff0e5db45493afef8b53dfca5ca05446f374fcaf42
generated_at: 2026-10-16T23:54:52.353143+00:00
model: ollama:qwen3.8:27b
---

# contracts/rest/operation-modules.ts

## Purpose

Auto-generated lookup table that maps every `@api` function name to the backend module string that owns the corresponding OpenAPI operation. It exists so consumers (routing, auth scoping, analytics attribution, tests) can resolve "which module does this operation belong to?" without re-parsing the spec.

## Key elements

- **`OPERATION_MODULES: Record<string, string>`** – The sole export. A flat object with ~250 entries mapping camelCase function names (e.g. `createProduct`, `confirmPayment`, `searchUsers`) to their owning module slug (e.g. `'products'`, `'payments'`, `'users'`). Modules observed include `account`, `addresses`, `api-keys`, `antibot`, `audit-logs`, `cart`, `delivery`, `example`, `feedback`, `invoicing`, `inventory`, `locales`, `notifications`, `observability`, `orders`, `payments`, `products`, `returns`, `shop`, `stats`, `users`, `webhooks`, `wishlist`.

## Relationships

- **`tests/cross-cutting/module-coupling.spec.ts`** – Consumes `OPERATION_MODULES` to assert that generated operations are assigned to a valid, known module and that no module is orphaned or mis-mapped. Acts as a regression guard on the generated mapping.

## Notes

- **Do not edit.** Regenerate with `npm run gen:api` after changing `openapi.yaml`. Manual edits will be overwritten.
- The module slug is a string, not an enum — typos in the spec's `x-module` tag (or equivalent) will silently produce a wrong mapping. The coupling spec is the only automated check.
- Keys are the generated TypeScript function names, not the OpenAPI operation IDs. If a function is renamed in the generator output, its key here changes accordingly.
