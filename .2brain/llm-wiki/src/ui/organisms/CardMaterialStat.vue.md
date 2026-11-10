---
source: src/ui/organisms/CardMaterialStat.vue
sha256: 1bcd30004cc8e5232d28cd25fe632c6020deca2d4f1e6c89b8880119f4547687
signature: 2d81945e51fa58ed09149fbc5a9a20ae7b90bbc929199221be1e3f5d7858a00f
generated_at: 2026-11-10T06:30:02.183670+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/CardMaterialStat.vue

## Purpose

A presentational stat tile that displays a label, a headline value, and an optional subtitle inside a Vuetify card with a single accent-coloured top border. It exists to give callers a consistent, minimal "material stat" widget without any business logic — the caller supplies all formatted values.

## Key elements

- **`props`** — `title` (string), `value` (string | number), `subtitle` (optional string), `accent` (optional `ThemeAccent`, defaults to `'primary'`). All values are pre-formatted by the caller.
- **`border` (computed)** — The only non-trivial logic. Builds a Vuetify `border` prop string: `` `t-lg ${accent} opacity-100` ``. The `t-lg` class sets a 4 px top border; the accent colour class technically applies to all sides but is only visible on the top because no other sides are bordered.
- **Template** — A `<v-card>` with `min-w-44` wrapping a `<v-card-text>` that renders the title (uppercase, tracking-widest), the value (3xl), and the subtitle (conditional, `v-if`).
- **`ThemeAccent`** — Imported as a type from `@/ui/types.ts`; constrains the `accent` prop and the border colour token.

## Relationships

No graph neighbors recorded. The component is a leaf: it imports only Vue's `computed` and the `ThemeAccent` type, and is consumed by parent components that render it.

## Notes

- The `value` prop is intentionally typed `string | number` so callers can pass either a raw number or a pre-formatted string (e.g. with units or commas). No internal formatting occurs.
- The border-colour trick (`t-lg` + a colour class that affects all four sides) is a deliberate workaround for Vuetify's border API — the card has borders only on top, so the "all-sides" colour class is harmless elsewhere.
- The component is purely layout; any conditional logic (showing/hiding) is left to the parent via `v-if` outside the component.
