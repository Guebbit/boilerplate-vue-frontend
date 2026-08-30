# src/ui/vuetify/index.ts

## Purpose

The single source of truth for the app's visual design. It configures Vuetify's theme (light & dark colour palettes), component-level defaults (rounding, variants, densities), the Lucide icon set, and built-in locale strings. Downstream projects restyle the entire UI by editing the palettes and the `defaults` block here—nothing else needs to change.

## Key elements

- **`light: ThemeDefinition`** — Light-mode colour tokens. Every `on-*` value is set explicitly to guarantee WCAG AA contrast (e.g. `on-primary` is dark brown, not white, because the orange primary is too light). Status colours (`success`, `warning`, `info`, `error`) are darkened so they pass 4.5:1 against their own 12 %-opacity tonal wash used by `VAlert`.
- **`dark: ThemeDefinition`** — Dark-mode palette. Swaps primary/secondary (cyan leads at night). `error` is lighter than the light-theme counterpart so it still reads on the dark surface.
- **`export default createVuetify(…)`** — The Vuetify instance installed by `src/main.ts`. Contains:
  - `theme` — `defaultTheme: 'system'`, both palettes, and `variations` (lighten/darken ×2 for primary, secondary, tertiary) used by gradients and hover states.
  - `icons` — Registers the Lucide set and its alias map (imported from `./icons.ts`).
  - `locale` — Vuetify's own i18n strings (data-table, pagination, aria-labels); kept in sync with vue-i18n by a `LayoutDefault` watcher.
  - `defaults` — App-wide component personality (button rounding, field variant/density, chip shape, alert variant, etc.). This is the intended "fork point" for changing how the app feels.

## Relationships

- **`src/ui/vuetify/icons.ts`** — Provides `lucideAliases` and `lucideIconSet`, which are wired into the `icons` section of the Vuetify instance.
- **`docs/reference/src-ui.md`** — Reference documentation for the UI layer; this file is the concrete implementation it points to.
- **`src/styles/tailwind.css`** (referenced in the header comment) — Tailwind defines *no* palette of its own; its colour utilities are aliases of the tokens defined here. Changing a hex in this file changes both Vuetify and Tailwind output.

## Notes

- **Contrast is intentional and documented inline.** Several colour choices (`error`, `success`, `warning`, `info`, `link`, `focus`) carry comments with measured ratios. Do not "simplify" them back to the Material defaults without re-checking the ratios, especially for tonal-variant components.
- **`primary` is a background colour, not a text colour.** Using it as inline text (e.g. a link) fails AA. Use the dedicated `link` token instead.
- **`focus` token** exists because the brand orange (~2:1 on white) cannot satisfy WCAG 2.4.11's 3:1 focus-indicator requirement. It reuses the `on-surface` near-black.
- **Locale sync is manual-ish.** Vuetify's internal strings (data-table headers, etc.) are set here; vue-i18n app strings live elsewhere. A `LayoutDefault` component watches the app locale to keep them aligned—easy to desynchronise if the watcher is removed.
