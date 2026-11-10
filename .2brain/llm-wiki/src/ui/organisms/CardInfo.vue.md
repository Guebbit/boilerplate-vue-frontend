---
source: src/ui/organisms/CardInfo.vue
sha256: ff0137736b4fc30745c5703fc1a40f25067f45f2cb052c1f9eaf0ba166e455d1
signature: 8a7c5de0ec70f99cdf18cf00a23dd9327a15b4695ef052b91e84934ea90941da
generated_at: 2026-11-10T06:29:54.082666+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/CardInfo.vue

## Purpose

A presentational "organism" that renders a small info card: a gradient icon tile (colored by theme accent) beside a title and description. Exists to give the UI kit a consistent, reusable card layout without any stateful logic beyond accent resolution.

## Key elements

- **`props`** — `title` (string), `description` (string), `accent` (optional `ThemeAccent`, defaults to `'primary'`).
- **`ACCENT_CLASSES`** — Top-level `const` mapping each `ThemeAccent` to its Tailwind gradient + text-color utilities. Kept at module scope so the Tailwind lint can detect the class strings.
- **`accentClass`** — Computed that looks up `ACCENT_CLASSES[props.accent ?? 'primary']`.
- **Template** — A Vuetify `v-card` laid out with a CSS grid (`grid-cols-term`). The icon tile is a 21-unit rounded square with the accent gradient; it exposes an `icon` slot (defaults to a 28 px lucide `Info`). The tile is `aria-hidden`. Title and description are plain `<h3>` / `<p>`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The `accent` prop name is a kit-wide convention shared with `CardMaterialStat` and `ItemDetailLayout` — don't rename it to `color` or `variant`.
- `-darken-1` suffixes (e.g. `primary-darken-1`) come from Vuetify's theme `variations` config, not from standard Tailwind; they only work because the Vuetify theme is loaded.
- `grid-cols-term` is a custom Tailwind column definition; the card depends on that token being present in the Tailwind config.
