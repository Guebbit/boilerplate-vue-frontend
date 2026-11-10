---
source: tests/unit/ui/use-theme-color-meta.spec.ts
sha256: 8114af9c28245323f6eed87cf09e033b9f01e60f05412cc731ce0f684e3c367f
signature: f9f46443a35eb49bad8ad453d655a8c47afbc861f94efd1bf341e6bcdb4f16a7
generated_at: 2026-11-10T08:32:01.861038+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/use-theme-color-meta.spec.ts

## Purpose

Unit tests for the `useThemeColorMeta` composable. They verify that mounting the composable (under a real Vuetify instance) writes the active theme's surface colour into every `<meta name="theme-color">` tag, and that a subsequent theme switch updates those tags to the new theme's surface.

## Key elements

- **`Probe`** – Minimal `defineComponent` that calls `useThemeColorMeta()` in `setup()` and captures the Vuetify `ThemeInstance` into the module-level `controller` variable. Renders nothing.
- **`mountProbe()`** – Mounts `Probe` with a full `createVuetify` instance configured from the app's real theme file (`light`, `dark`, `variations`), defaulting to the light theme.
- **`contents()`** – Reads the `content` attribute of every `meta[name="theme-color"]` tag in `document.head` and returns them as an array.
- **Test 1 ("writes the active theme's surface…")** – Seeds two `theme-color` meta tags (light + dark media queries) in `document.head`, mounts the probe, asserts both tags show `light.colors.surface`, then calls `controller.change('dark')`, awaits `nextTick`, and asserts both show `dark.colors.surface`.
- **Test 2 ("does nothing when…")** – Mounts the probe with an empty `document.head` and asserts no meta tags appear.
- **`afterEach`** – Replaces `document.head` children (clears all meta tags) and resets `controller` to `undefined`.

## Relationships

- **`tests/unit/scripts/pairing/spec-identity.spec.ts`** – Sibling unit-test file in the same test suite; no import or shared-utility dependency is visible in this file's source. The relationship is structural (both exercise Vuetify-theme-dependent logic) rather than a direct code-level dependency.

## Notes

- The tests manipulate `document.head` directly rather than asserting on component DOM, because the composable writes to page-level `<meta>` tags.
- A real Vuetify instance is used (no mocks), so theme switching exercises Vuetify's own reactive pipeline.
- `afterEach` wipes `document.head` entirely; any test that seeds meta tags must do so in its own `it` block or they will be lost.
- The `controller` variable is module-scoped, not per-test; it is only valid while the probe is mounted.
