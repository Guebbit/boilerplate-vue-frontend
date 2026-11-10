---
source: src/ui/organisms/RecordAsideCard.vue
sha256: ffa18cdaf351760c4b07841941fadf5e471e57a5100702e6501de426ac8dea26
signature: 022843f4d9a620197c926d8be79961550b0221f01a82c8a7f381a6accde8aa05
generated_at: 2026-11-10T06:32:30.100871+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/RecordAsideCard.vue

## Purpose

A purely presentational right-hand summary card for detail or edit pages. It renders an accent tile (title, description, optional icon) followed by a set of labelled field rows and any additional content supplied via the default slot. The component owns no business logic; all labels and values arrive already translated and formatted, making it reusable across any module.

## Key elements

- **`title`** (prop, `string`) — text shown in the accent tile.
- **`description`** (prop, `string`) — body text in the accent tile.
- **`accent`** (prop, `ThemeAccent?`) — theme accent for the icon tile; defaults to `primary` via `CardInfo`.
- **`fields`** (prop, `DetailFieldRow[]?`) — ordered list of labelled rows rendered one-per-entry via `ItemDetailField`. Each row carries `label`, `value`, optional `icon`, and optional `data-test` hook.
- **`icon` slot** — optional; placed inside the `CardInfo` tile. Omitted if absent (letting `CardInfo` use its fallback).
- **`default` slot** — optional; rendered after the field rows for arbitrary extra content.
- **Template structure** — wraps everything in `CardDetail as="aside"` with `flex flex-col gap-4`, composing `CardInfo` → looped `ItemDetailField` → default slot.

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf consumer of `CardDetail`, `CardInfo`, `ItemDetailField`, and the shared types `DetailFieldRow` / `ThemeAccent`, but none of those files list it as a dependent.

## Notes

- The component is intentionally "dumb": do not import domain services or i18n here. Translation and formatting are the caller's responsibility.
- `fields` keys are derived from `row.label` (`:key="row.label"`), so labels must be unique within a given card instance.
- The `icon` slot is conditionally forwarded (`v-if="$slots.icon"`); if the caller provides no icon slot, `CardInfo` renders its own default icon.
- Rendered as a semantic `<aside>` element (via `CardDetail as="aside"`), so it is appropriate for supplementary content on the page.
