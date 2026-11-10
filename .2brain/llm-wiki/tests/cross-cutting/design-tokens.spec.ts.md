---
source: tests/cross-cutting/design-tokens.spec.ts
sha256: a9b68c8e0798d00812c80b99a95533293203650875d4dbf6187dd3ce944f4169
signature: 989c36ab00926fc5f03bebfb7d54d26f2b56151a01d0b63685b568b9ea14f8b2
generated_at: 2026-11-10T06:36:28.264760+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/design-tokens.spec.ts

## Purpose

Vitest spec that enforces the "stylesheet half" of the design-token lint. Where the `local/theme-token` rule covers scripts and templates at the AST level, this file validates what that lint cannot read: raw CSS in `main.css`, SFC `<style>` blocks, Vuetify's computed theme, boot-surface files, and WCAG contrast for secondary text.

## Key elements

- **`parsed`** — all CSS sources (from `cssSources()`) parsed into PostCSS ASTs at module load.
- **`declarations()`** — flattens every `Declaration` across all sources, tagging each with its file path.
- **`holdsColorLiteral(decl)`** — two-pass check: first `isColorLiteral` on the whole value, then a word-level scan for CSS named colours in colour-relevant properties.
- **`COLOR_PROPERTY`** — regex matching properties that can carry a bare colour word (e.g. `border: 1px solid red`).
- **`themeValues()`** — `Set` of every hex colour across `light.colors` and `dark.colors`, lower-cased.
- **`hexColorsIn(text)`** — extracts all hex colour literals (3/4/6/8-digit) from an arbitrary string.
- **`luminance` / `over` / `contrast`** — WCAG relative-luminance, alpha-compositing, and contrast-ratio helpers (pure functions, no DOM).
- **`describe('design tokens, the stylesheet half')`** — six tests: no bare colour literals outside `@theme`, `var(--v-theme-*)` names must exist, light/dark key parity, Tailwind alias validity, breakpoint usage, and Vuetify computed-name agreement.
- **`describe('design tokens, the boot surfaces')`** — validates `index.html`, the web manifest, and `browserconfig.xml` only reference theme colours; checks `theme-color` meta tags and splash styling.
- **`describe('design tokens, secondary text')`** — parameterised AA contrast check for `on-surface` and `error` at `medium-emphasis-opacity` over every surface, in both themes.

## Relationships

- **`scripts/css-sources.ts`** — supplies `cssSources()` (enumerates all CSS files), `insideTheme()` (checks whether a node is inside an `@theme` block), and `readRoot()` (reads a file from the repo root). The test's entire CSS-parsing pipeline depends on these.
- **`scripts/design-policy.ts`** — supplies `isColorLiteral()`, `themeColorNames()` (the set of valid `--v-theme-*` names), and `CSS_NAMED_COLORS`. The test reuses these so its rules stay in lockstep with the lint rule's logic.
- **`src/ui/vuetify/theme.ts`** — exports `light`, `dark`, and `variations`. The test reads these directly to build `themeValues()`, assert key parity, instantiate a real Vuetify instance for name comparison, and drive the contrast calculations.

## Notes

- The breakpoint test assumes `main.css` is `parsed[0]`; if `cssSources()` reorders its output, the `parsed[0]?.root` lookup silently yields `undefined` and the test passes vacuously.
- `max-width` media queries are permitted to be 0.02 px below a declared breakpoint (e.g. `599.98` for `600`), so the check falls back to `Math.round(px)`.
- The `variations` test hard-asserts `[2, 2]`. Adding a third lighten/darken step requires a matching change to the `ThemeColor` union in `src/ui/types.ts` *and* this literal.
- `holdsColorLiteral` only flags CSS *named* colours in the word-level pass (e.g. `red`, `blue`); hex and `rgb()` literals are caught by the first `isColorLiteral` check from `design-policy`.
