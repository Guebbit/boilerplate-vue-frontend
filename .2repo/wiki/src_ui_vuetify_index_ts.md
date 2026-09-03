# src/ui/vuetify/index.ts

## Purpose

The single source of truth for all design tokens in the project: Vuetify color palettes (light & dark), component `defaults`, display breakpoints, icon configuration, and locale setup. Downstream forks restyle the entire app by editing this file and `./icons.ts` alone; Tailwind only aliases these colors and defines no palette of its own.

## Key elements

- **`light` / `dark`** — Two `ThemeDefinition` objects. Every color token is explicitly set (including `on-*`) to guarantee WCAG AA contrast. Status colors (`success`, `warning`, `info`) are darkened specifically because `VAlert` defaults to `variant="tonal"`, rendering them at 12 % opacity as the background. `focus` and `link` are separate tokens rather than reusing `primary` (which is too light as text-on-white in the light theme).
- **`export default createVuetify({…})`** — The configured Vuetify instance, installed by `src/main.ts`. Configures:
  - `display.thresholds` — mirrors Tailwind's breakpoints in `src/styles/main.css` so `useDisplay()` and Tailwind's `sm:`/`md:`/etc. agree.
  - `theme` — `defaultTheme: 'system'`, both palettes, and `variations` (±2 lighten/darken on primary, secondary, tertiary).
  - `icons` — registers the Lucide set and aliases from `./icons.ts`.
  - `locale` — English + Italian Vuetify built-in strings; kept in sync with vue-i18n by `LayoutDefault`.
  - `defaults` — per-component look-and-feel (rounded corners, flat buttons, outlined fields, tonal alerts, etc.). This is the "personality" layer a fork overrides.

## Relationships

- **`src/ui/vuetify/icons.ts`** — Provides `lucideAliases` and `lucideIconSet`, which are wired into the `icons` section of the Vuetify instance. This file is the sole consumer of those exports.
- **`src/main.ts`** — Imports and installs the default-exported Vuetify instance into the app (not imported here; this file is a dependency of `main.ts`).
- **`src/styles/tailwind.css`** — Aliases the color tokens defined here; it does not define its own palette.
- **`src/styles/main.css`** — The focus-ring halo and Tailwind breakpoints that `display.thresholds` must stay in sync with.

## Notes

- Status colors were deliberately chosen *darker* (light theme) or *lighter* (dark theme) than "standard" Material values so they pass 4.5:1 against their own 12 %-opacity tonal wash in `VAlert`. Changing them back to brighter hues will break that contrast.
- `primary` in the light theme is intentionally a *background* color (dark `on-primary` text sits on it). It must never be reused as text-on-white; use the `link` token instead.
- Display thresholds are not Vuetify's defaults; they were set to match the project's Tailwind breakpoints. If either side changes, both must be updated together.
- The file header comment states the design-token ownership rule: Vuetify owns the palette, Tailwind only aliases it. Keep that boundary when adding tokens.
