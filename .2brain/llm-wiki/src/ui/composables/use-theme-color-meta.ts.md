---
source: src/ui/composables/use-theme-color-meta.ts
sha256: d5ebb8c93101eab48709d1762c93ddb91cfcee3829cff846c481fdc9f2110f82
signature: e6e3552457e9d61cc77c8e3cf70cbd6f75c1cb9e9d475b90628b4d1bddb2fc68
generated_at: 2026-11-10T06:25:31.085552+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-theme-color-meta.ts

## Purpose

Keeps the browser address-bar colour (the `<meta name="theme-color">` tags) in sync with the app's active Vuetify theme. This is necessary because the static pair in `index.html` only reflects `prefers-color-scheme` (i.e. the OS), so a user who forces the opposite theme would otherwise see the wrong chrome colour.

## Key elements

- **`useThemeColorMeta()`** — the sole export. Call once at app-shell mount. It:
  - Reads the active theme via Vuetify's `useTheme()`.
  - Watches `theme.global.current.value.colors.surface` (with `immediate: true`).
  - Writes the resulting hex string into every `<meta name="theme-color">` element's `content` attribute.
  - Skips the write if the value is not a `string` (Vuetify types the colour union as `string | number | RGB | HSV`).

## Relationships

No graph neighbors recorded. The composable depends on Vue (`watch`) and Vuetify (`useTheme`) at the import level; it has no project-internal imports or exports consumed elsewhere.

## Notes

- The `index.html` meta tags are the *initial* source; this composable only *updates* them reactively. If you remove the meta tags from the HTML, this composable has nothing to write to.
- `Array.from` is used instead of `[...nodeList]` because the project's TS lib config ("DOM" without "DOM.Iterable") does not make `NodeList` iterable, so spread would not type-check. A `unicorn/prefer-spread` eslint-disable documents this.
- The `surface` colour is chosen deliberately because it matches the app-bar colour; it is not a generic background token.
- `immediate: true` means the first synchronous write happens on mount, not on a later reactive tick — so the very first paint may still show the `index.html` value for one frame.
