---
source: src/modules/observability/components/AuditMetadataDetail.vue
sha256: 9d17f2f62c437d21ecf00278b55e6e51a00765145ff01eb1cdc2b9190c4a138f
signature: b57415d08a162efd5d8852d25c56875c0d28378665e74ec072f71cc3614d9305
generated_at: 2026-11-10T04:51:47.364171+00:00
model: ollama:qwen3.8:27b
---

# src/modules/observability/components/AuditMetadataDetail.vue

## Purpose

Renders the `metadata` object of a single audit row as an expandable detail section: non-`changes` keys as a label/value list, and the `changes` sub-object (field → `{ from, to }`) as a dedicated table. It is intentionally generic—reads no action name—so newly audited actions surface their extras without touching this component. Renders nothing when the row has no metadata or no displayable content.

## Key elements

- **`metadata` prop** — `Record<string, unknown> | undefined`; the open metadata object as returned by the API.
- **`display(value)`** — Formats any metadata value for text: strings pass through, `null`/`undefined` become `—`, everything else is compact `JSON.stringify`.
- **`changes` (computed)** — Extracts `metadata.changes` into a `FieldChange[]` (`field`, `from`, `to`), filtering out non-object entries. Empty array when absent.
- **`pairs` (computed)** — All metadata entries *except* `changes` (unless `changes` is empty), mapped to `{ key, value }` for the `<dl>` list.
- **`open` / `size` / `regionId`** — Local expand/collapse state, touch-friendly button size, and a `useId` for `aria-controls` wiring.
- **Template** — A `v-btn` toggle (with `aria-expanded`/`aria-controls`) followed by a `v-show` region containing a `<dl>` of pairs and/or a `<table>` of field changes. Root `<div>` is hidden (`v-if`) when there is nothing to show.

## Relationships

- **`AdminAuditTab.vue`** — Parent that supplies the `metadata` prop for each audit row and places this component inside its row markup.
- **`audit-metadata-detail.spec.ts`** — Unit tests targeting this component's rendering (pairs, changes table, empty-state, toggle behavior).

## Notes

- The `changes` key is excluded from the generic `pairs` list only when the parsed `changes` array is non-empty; if `metadata.changes` exists but contains no valid `{from, to}` entries, it falls back to appearing as a plain pair.
- `isChange` deliberately excludes arrays (a non-Array check), so an array value under `changes` is treated as a plain pair rather than a table row.
- The component emits no events and has no side effects; all state is local. Tests can rely on the `data-test` attributes (`audit-details-toggle`, `audit-details`, `audit-changes`) for selectors.
