---
source: src/ui/types.ts
sha256: 3e57c12c0b75478ffe05e0a434f6012331e51c7683b96cbc693ab28b63df2b4a
signature: 9744c8abba469981ca2301af707036622ce0f7a8238cb3714f2537b051241e86
generated_at: 2026-11-10T06:33:31.027260+00:00
model: ollama:qwen3.8:27b
---

# src/ui/types.ts

## Purpose

A types-only module (`@module`) that defines the shared colour-name vocabulary and a small UI-row shape used across organisms and molecules. It exists so that template `color` props, `--v-theme-*` variables, and script-side status maps all resolve against one canonical set of valid Vuetify colour strings, giving `vue-tsc` a way to reject typos that no template-level lint rule could catch.

## Key elements

- **`VariationLevel`** (internal) — Literal union `1 | 2`; the lighten/darken steps Vuetify generates per colour family.
- **`BaseThemeColor`** (internal) — Every declared key of `light.colors` excluding `on-*` pairs, plus `VUETIFY_DEFAULT_COLORS` entries.
- **`VariationColor`** (internal) — Template-literal type producing names like `primary-darken-1`, `tertiary-lighten-2`.
- **`ThemeColor`** (exported) — Union of `BaseThemeColor`, `VariationColor`, and every `on-*` counterpart; the complete set of strings a template or script may pass to a Vuetify `color` prop.
- **`ThemeAccent`** (exported) — `Extract<ThemeColor, 'primary' | 'secondary' | 'tertiary'>`; the three accent keys organisms use for their `variant`/`accent` prop.
- **`DetailFieldRow`** (exported interface) — Shape for one labelled row in a `RecordAsideCard`: `label`, optional `value`, optional `icon` (Vue `Component`), optional `test` hook.

## Relationships

No graph neighbors recorded for this file.

## Notes

- The file is **types only** — no runtime exports. Consumers use `import type { … } from '@/ui/types'`.
- `VariationLevel` is deliberately unexported; it is an implementation detail of the string-literal construction and is only surfaced through the resulting `ThemeColor` / `VariationColor` strings.
- The `on-*` text-colour counterparts are part of `ThemeColor` but **not** part of `BaseThemeColor`; code that needs "the colour itself" (e.g. to build a CSS variable) should use `BaseThemeColor` or `VariationColor` to avoid accidentally accepting `on-primary`.
- `ThemeAccent` is narrower than `ThemeColor` on purpose: it constrains organism-level props to the three semantic accents, not the full palette.
