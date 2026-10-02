---
source: contracts/permission-actions.ts
sha256: e0f9eb85c144b0cb37a1f45d3add915e3683715debaf8b4afa09750ddae8f181
generated_at: 2026-10-02T11:18:49.537648+00:00
model: ollama:qwen3.8:27b
---

# contracts/permission-actions.ts

## Purpose

Auto-generated TypeScript module that exports the canonical set of permission action strings and a corresponding union type. It is derived from the shared `authorization-keys.yaml` (`actions:` block) so that every consumer shares a single source of truth for valid actions.

## Key elements

- **`PERMISSION_ACTIONS`** – A `readonly` tuple (`as const`) of the nine permitted action strings: `read`, `create`, `update`, `delete`, `checkout`, `sweep`, `override`, `start`, `receive`.
- **`PermissionAction`** – A union type of the individual literal strings, derived from the tuple via `(typeof PERMISSION_ACTIONS)[number]`. Use this type wherever a single action value is expected.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Generated file** – Regenerate with `npm run gen:api`; do not edit by hand. The source of truth is `shared/authorization-keys.yaml`.
- The array uses `as const`, so `PERMISSION_ACTIONS` is a literal readonly tuple rather than a mutable `string[]`. This is what allows `PermissionAction` to be a precise string-literal union instead of `string`.
- New actions must be added in the YAML source and regenerated; adding them here directly will be overwritten.
