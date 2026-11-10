---
source: src/ui/vuetify/index.ts
sha256: 4102573750c01cc4d94b4ec0a4037105bdf40178c5a49225b6c4da7a6327314e
signature: 4102573750c01cc4d94b4ec0a4037105bdf40178c5a49225b6c4da7a6327314e
generated_at: 2026-11-10T06:34:07.149387+00:00
model: ollama:qwen3.8:27b
---

# src/ui/vuetify/index.ts

## Purpose

Creates and exports the single Vuetify instance for the app. It wires together the theme palette, icon set, responsive breakpoints, locale messages, and a block of component `defaults` that define the app's visual personality. Installed once by `src/main.ts`; every Vuetify component in the app inherits from it unless a view overrides a prop.

## Key elements

- **`export default createVuetify({...})`** — the sole export; a fully configured Vuetify instance.
- **`theme`** — sets `defaultTheme` from persisted user preference (falls back to `'system'`), registers the `light`/`dark` palettes, and generates color variations (e.g. `primary-darken-1`).
- **`icons`** — declares Lucide as the default icon set, supplies aliases, and injects the icon map.
- **`display`** — passes breakpoint thresholds so Vuetify's responsive utilities align with Tailwind's.
- **`locale`** — enables English and Italian Vuetify strings; kept in sync with the app's vue-i18n locale by `LayoutDefault`.
- **`defaults`** — per-component prop presets (VBtn, VCard, VTextField, VTextarea, VSelect, VCheckbox, VSwitch, VAlert, VChip, VPagination, VDataTable, VTooltip). This is the primary "restyle the app" surface for forks.

## Relationships

- **`src/ui/vuetify/breakpoints.ts`** — provides the `display` object (breakpoint thresholds) consumed by the Vuetify instance.
- **`src/ui/vuetify/icons.ts`** — provides `lucideAliases` and `lucideIconSet`, injected into the `icons` config.
- **`src/ui/vuetify/theme.ts`** — provides the `light` and `dark` color palettes and the `variations` list consumed by the `theme` config.

## Notes

- Design tokens are split: Vuetify owns color/typography/component defaults (this file + `theme.ts`); Tailwind owns spacing, type scale, z-index, and layout, and merely *aliases* the Vuetify colors in `src/styles/main.css`. Neither layer owns the other's tokens.
- The `defaults` block is intentionally the "feel" layer—changing how the app looks without touching individual components. Downstream forks edit `./theme.ts` (palette) and `defaults` (personality) to rebrand.
- `defaultTheme` resolves at module-evaluation time via `readThemePreference()`; if no preference is stored it falls back to Vuetify's `'system'` (OS-level dark mode), not a hardcoded light theme.
