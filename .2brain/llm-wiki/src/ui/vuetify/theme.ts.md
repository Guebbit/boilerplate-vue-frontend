---
source: src/ui/vuetify/theme.ts
sha256: c907ad6416569370f7c5223bf3bdb74a23edeedbafc650bf1e29087a594f8039
signature: 78ea9b662eac72f0bc33f76fb6d0ecd16d712ac71c1a76528d20c74ad6f0a436
generated_at: 2026-11-10T06:34:20.531762+00:00
model: ollama:qwen3.8:27b
---

# src/ui/vuetify/theme.ts

## Purpose

Pure-data definition of the light and dark colour palettes, their generated-variant configuration, and the set of Vuetify-intrinsic colour names. The file imports only a type from Vuetify (no runtime code), so tooling that cannot load the full Vuetify bundle—lint rules, the design-policy script, and token specs—can still read the exact hex values the app ships with.

## Key elements

- **`light`** — `ThemeDefinition` for the light theme. Orange primary, cyan secondary, purple tertiary. Explicit `on-*` colours guarantee WCAG AA contrast (orange/cyan are too light for white text). `medium-emphasis-opacity` raised to 0.82 for label/hint/subtitle legibility.
- **`dark`** — Satisfies a structural type derived from `light`'s keys. Primary/secondary swap (cyan leads). Error lightened, link and focus tuned for the dark surface. Same 0.82 emphasis opacity.
- **`variations`** — Tells Vuetify which colour families get `-lighten-N` / `-darken-N` tokens and how many (2 each, for primary/secondary/tertiary).
- **`VARIATION_FAMILIES`** — `readonly ['primary','secondary','tertiary']`. The canonical list for any code that derives variant names; `variations.colors` is the same list in mutable `string[]` form for Vuetify.
- **`VUETIFY_DEFAULT_COLORS`** — Flat list of every colour name Vuetify makes available regardless of whether the theme explicitly declares it (includes `surface-bright`, `surface-light`). Used to validate template colour references.

## Relationships

- **`src/ui/vuetify/index.ts`** — Builds and exports the Vuetify instance; consumes the `light`, `dark`, and `variations` exports from this file.
- **`scripts/design-policy.ts`** — Reads the colour values from this file to enforce policy (contrast, naming) without loading Vuetify's runtime.
- **`tests/cross-cutting/design-tokens.spec.ts`** — Asserts on the same hex values and structural shape exported here.
- **`CLAUDE.md`** — Project-level instructions that reference this file's conventions (Tailwind aliases these colours only; breakpoints live elsewhere).

## Notes

- **Do not import Vuetify runtime here.** The file intentionally has a single `import type` so that static analysis tools can load it. Adding a value import of `vuetify` would break the design-policy script and token spec.
- **`dark` does not use `ThemeDefinition`.** It satisfies a structural type built from `light`'s keys. This keeps the two objects locked in shape without a circular type dependency.
- **`focus` is deliberately near-black (light) / cyan (dark), not brand orange.** Orange fails the 3:1 requirement of WCAG 2.4.11 for focus indicators on white.
- **`link` is a separate token from `primary`.** `primary` is designed as a background with dark text on top; reusing it as text colour on a white surface fails AA. `link` is the same hue darkened until it passes.
- **`medium-emphasis-opacity: 0.82`** is the single "secondary text" value across both themes. Changing it here changes label, hint, list-subtitle, and sort-icon opacity app-wide.
- **Breakpoint thresholds are intentionally absent.** They live with the display config, not in this colour file.
