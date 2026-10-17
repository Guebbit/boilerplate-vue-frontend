---
source: contracts/permission-actions.ts
sha256: 0ebfcaa58753c39aa62a858141a7aa177410b42fce2cfcf2a375ff87a509ea95
generated_at: 2026-10-16T23:54:22.456472+00:00
model: ollama:qwen3.8:27b
---

# contracts/permission-actions.ts

## Purpose

Generated contract file that defines the closed set of valid permission actions in the system. It exists as a single source of truth for TypeScript consumers (frontend, backend, tests) so that every action string used in permission checks is type-checked against the same list. Regenerate it rather than editing by hand.

## Key elements

- **`PERMISSION_ACTIONS`** — A readonly `as const` array of 14 string literals: `read`, `create`, `update`, `delete`, `checkout`, `sweep`, `override`, `start`, `receive`, `ban`, `export`, `assign`, `display`, `admin`.
- **`PermissionAction`** — Union type derived from the array via `(typeof PERMISSION_ACTIONS)[number]`. Use this type to annotate any parameter, return, or field that represents a single action.

## Relationships

None recorded in the dependency graph. This file is a leaf: it imports nothing and is intended to be imported by permission-related modules, API handlers, and frontend UI components.

## Notes

- **Do not edit manually.** The file header states it is produced by `npm run gen:api` from `shared/authorization-keys.yaml` (`actions:` key). If a new action is needed, add it to the YAML source and re-run the generator.
- The `as const` + index-access pattern means the order in the array is meaningful for exhaustiveness checks but the union itself is order-independent.
- The set mixes generic CRUD verbs with domain-specific verbs (e.g. `checkout`, `sweep`, `ban`). There is no hierarchical or grouping structure—treat it as a flat enumeration.
