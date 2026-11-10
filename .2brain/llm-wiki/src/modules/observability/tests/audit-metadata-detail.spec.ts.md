---
source: src/modules/observability/tests/audit-metadata-detail.spec.ts
sha256: 9446ea267fe0152f59ec217612c8de296241ea72f4509fa724f0fc73e3ea5460
signature: 4b49f1e0fad01de25528ce43549a390c5cbff281a3d55053c4a3e44cd3da7f3f
generated_at: 2026-11-10T04:53:54.521360+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/tests/audit-metadata-detail.spec.ts

## Purpose

Vitest unit tests for the `AuditMetadataDetail.vue` component. They verify the component's shape-handling contract: empty metadata renders nothing, the details panel toggles open/closed with correct ARIA state, scalar and composite values render as compact JSON, and a `changes` key is rendered as a before/after table rather than a plain key-value pair.

## Key elements

- **`mountDetail(metadata?)`** — helper that mounts `AuditMetadataDetail` with the given `metadata` prop, Vuetify, i18n, and `attachTo: document.body` (required for `isVisible()`).
- **`beforeEach`** — clears `document.body` and loads the `en` locale before each test.
- **`describe('AuditMetadataDetail')`** — five test cases:
  - `it.each([undefined, {}])` — no toggle button rendered for empty/absent metadata.
  - Toggle test — panel starts closed (`aria-expanded="false"`, not visible); clicking the toggle flips both.
  - Key/value listing — arrays and scalars appear as their compact JSON / raw string in the detail text.
  - `changes` table — renders a `<tbody>` row per field with `th` + two `td` cells; `null` values shown as `—`; the `<dl>` key-value list is suppressed when `changes` is a valid change set.
  - Non-object `changes` — falls back to a plain key-value entry in the `<dl>`, no table element present.

## Relationships

- **`src/modules/observability/components/AuditMetadataDetail.vue`** — the component under test; this spec mounts it and asserts on its rendered DOM.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called once at module load to register stubs/aliases so the component's transitive imports resolve in the Vitest environment.

## Notes

- `attachTo: document.body` plus the `beforeEach` clear is the pattern used to make `isVisible()` assertions work; omitting either will cause false visibility results.
- The `changes` key is the only key the component treats specially: if it is a plain object with `from`/`to` entries it becomes a table; otherwise it is printed like any other metadata key. Tests cover both branches.
- The component is intentionally action-agnostic (per the module doc comment), so these tests pin the *shape* handling, not the semantics of any particular audited event.
