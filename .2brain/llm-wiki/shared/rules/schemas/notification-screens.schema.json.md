---
source: shared/rules/schemas/notification-screens.schema.json
sha256: 54b412b48972fcd6deb435fcd0e8b2c50a18fd22f1ccf348f3a02be9d08bff89
signature: 9a6102c90404ad47adc527ed1e3ba7210a2e00bccb4c5f13139c6271401321b7
generated_at: 2026-11-10T02:48:15.218215+00:00
model: ollama:qwen3.8:27b
---

# shared/rules/schemas/notification-screens.schema.json

## Purpose

A JSON Schema (draft 2020-12) that validates the shape of a notification-screen mapping configuration. It ensures the `summaryScreens` object uses fully-qualified staff screen identifiers as keys and restricts values to a fixed set of known shop-task screens, preventing typos or unknown screen references in notification routing rules.

## Key elements

- **`summaryScreens`** (required, object) — The single top-level property. Each entry maps a staff-screen identifier to the shop-task screen it summarizes.
  - **`propertyNames.pattern`** — Keys must match `^shop-tasks\.staff\.[a-z-]+$` (e.g. `shop-tasks.staff.incoming`), enforcing the `shop-tasks.staff.` namespace and lowercase-hyphenated suffixes.
  - **`additionalProperties.enum`** — Values are constrained to one of: `sales-orders`, `payments`, `returns`, `preorders`, `inventory`.
- **`additionalProperties: false`** (top-level) — No properties other than `summaryScreens` are permitted on the validated object.

## Relationships

No graph neighbors detected; this schema is a standalone validation artifact with no imports or in-repo dependents.

## Notes

- The `propertyNames` constraint means *every* key in the object must conform to the pattern; you cannot mix a valid key with an invalid one in the same object.
- Because the schema uses `additionalProperties` with an `enum` (rather than a `$ref` to a shared enum), the allowed screen list is defined inline here. If a new shop-task screen is added, this file must be updated manually.
- The file lives under `shared/rules/schemas/`, indicating it is shared across rule packages, but no other files in the dependency graph import it yet—validation may be wired up externally or planned.
