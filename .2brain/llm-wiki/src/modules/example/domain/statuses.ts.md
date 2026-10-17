---
source: src/modules/example/domain/statuses.ts
sha256: 57ecc98cc06d8a65cb5374248fc5b11ab0e13deaad3d890c986ed9aec2f60153
generated_at: 2026-10-17T00:50:48.801972+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/domain/statuses.ts

## Purpose

Defines the allowed status transitions for an example on the client side and derives the canonical list of all statuses. Exists as a pure, store-free module so that Vue components (which must not import the generated API client) can read the transition rules without pulling in HTTP infrastructure.

## Key elements

- **`NEXT_STATUSES`** — `Readonly<Record<ExampleStatus, readonly ExampleStatus[]>>`. Maps every status to the statuses it may transition to (draft → published, archived; published → archived; archived → draft). Using `Record<ExampleStatus, …>` means a new status added to the `ExampleStatus` type is a compile error here until a row is supplied.
- **`EXAMPLE_STATUSES`** — `ExampleStatus[]`. Derived from `Object.keys(NEXT_STATUSES)`, giving screens a single source of truth for "all statuses, in display order" instead of maintaining a second list.

## Relationships

- **`domain/index.ts`** — Barrel file that re-exports the two constants so other modules can import from `@/modules/example/domain` directly.
- **`components/ExampleStatusActions.vue`** — Consumes `NEXT_STATUSES` to decide which action buttons to render for a given status.
- **`views/ExampleEdit.vue`** / **`views/ExamplesList.vue`** — Read `EXAMPLE_STATUSES` (or `NEXT_STATUSES`) to order filter chips or guard transition UI.
- **`schemas.ts`** — Source of the `ExampleStatus` type that both exports are keyed on.
- **`tests/domain.spec.ts`** — Unit-tests the transition map and the derived list.

## Notes

- The server is the authoritative source of truth; these rules only prevent a screen from *offering* a transition the API would reject.
- `EXAMPLE_STATUSES` order is whatever order the `Record` keys appear in the object literal—reorder the literal to change display order; there is no separate sort config.
- The `as ExampleStatus[]` cast on `EXAMPLE_STATUSES` is safe only because the key type of the `Record` *is* `ExampleStatus`; do not widen the key type without updating the cast.
