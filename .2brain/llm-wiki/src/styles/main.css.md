---
source: src/styles/main.css
sha256: 7e5b5413346b6b57dcdfb21f16f693252953e0f1b7dcf77a793c1bbfba8524bd
signature: 7e5b5413346b6b57dcdfb21f16f693252953e0f1b7dcf77a793c1bbfba8524bd
generated_at: 2026-11-10T06:22:19.713394+00:00
model: ollama:qwen3.8:27b
---

# src/styles/main.css

## Purpose

Global entry point that configures Tailwind v4 to coexist with Vuetify. It establishes the cascade layer order, strips Tailwind's default palettes/fonts/radii/shadows in favor of Vuetify's theme tokens, and declares the small set of layout tokens (spacing-independent containers, grid templates, z-index tiers) that belong to neither library's built-ins. Every Tailwind utility class in the app resolves through the values defined or mapped here.

## Key elements

- **`@layer` declaration** — fixes global cascade order: `vuetify-core → vuetify-components → vuetify-overrides → vuetify-utilities → theme → base → components → utilities → vuetify-final`. Tailwind utilities beat Vuetify components; Vuetify's intentional finals (transitions, trumps) stay on top.
- **`@theme` block** — wipes `--color-*`, `--font-*`, `--radius-*`, `--shadow-*`, `--breakpoint-*` from Tailwind's defaults and re-declares only the values the app needs (Vuetify-aligned breakpoints sm 600 / md 960 / lg 1280 / xl 1920, Vuetify radius values, `--container-toast`, `--z-index-*` tiers, `--grid-template-columns-*`, `--tracking-eyebrow/label`).
- **`@theme inline` block** — maps 16+ Vuetify semantic colour tokens (`--v-theme-*`) into Tailwind colour names (`--color-primary`, `--color-surface`, `--color-on-surface`, etc.) using `rgb(var(--v-theme-…))` so light/dark switching stays live at the element level. Also exposes `--color-detail-accent` and three `*-darken-1` variants.
- **`@source '../'` + `source(none)`** — restricts Tailwind's class scanner to the `src/` directory only; docs and wiki pages cannot generate CSS.
- **`@layer base` rules** — `scroll-padding-top/bottom` (clears the fixed app bar and toast stack), `:focus-visible` ring using the Vuetify `focus` token, and a `prefers-reduced-motion: reduce` override that zeroes animation/transition durations while still firing `transitionend` (required by Vuetify overlay close logic).
- **`@utility opacity-muted`** — single-utility that reads Vuetify's medium-emphasis opacity variable, keeping "secondary text" in one place.
- **`.surface-glow` (in `@layer components`)** — two radial-gradient glow over `surface`; driven by custom properties (`--glow-color`, `--glow-strength`, `--glow-reach`, optional `--glow-far-*`). Sits after Vuetify's component layer so it wins over a flat card background.

## Relationships

- **CLAUDE.md** — project-level AI instruction file that governs the conventions and ownership rules for this file. The token-ownership table referenced in this file's header (Vuetify owns colour/font/radius/elevation; Tailwind owns spacing/type/z-index/layout tokens) is the contract CLAUDE.md enforces when directing edits to this stylesheet.

## Notes

- `@theme inline` is deliberate: it keeps the `var()` reference inside each generated utility so the value resolves against the *current* Vuetify theme at the consuming element. Moving these tokens to plain `@theme` would break light/dark switching.
- `--color-transparent` is the **only** fixed colour in the theme; white and black are intentionally absent. Use `surface` / `on-surface` pairs instead.
- The `prefers-reduced-motion: reduce` block uses `0.01ms` rather than `0s`/`none` so that `transitionend`/`animationend` events still fire — Vuetify's overlay close animations depend on those events.
- Preflight (Tailwind's reset) is **not** imported; it would conflict with Vuetify's own reset.
- The `@layer base` section is meant to stay minimal; larger rules belong in a component or in the Vuetify theme defaults (`src/ui/vuetify/theme.ts`).
- Layout tokens (`--container-*`, `--grid-template-columns-*`) are the canonical source; a `npm run lint:fix` pass rewrites matching arbitrary values in components back to these named tokens.
- The file's header comments point to `docs/theory/design-system.md` for the full rationale behind the ownership split; that document is the design-level reference, not a dependency of this file.
