---
source: src/ui/composables/use-fullscreen-dialog.ts
sha256: 202fbe7fd5f89ff958347ac91db49afc1016c82abe4f2217876c783cd0b9ef0f
signature: 6f4902b0708c6f05f06d31248825d57e8b70ee525fec4af4641e2ce0a1d7d03c
generated_at: 2026-11-10T06:23:26.841591+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-fullscreen-dialog.ts

## Purpose

Single-source composable that tells every dialog in the app whether it should render fullscreen (mobile) or as a fixed-width floating panel (desktop). Centralising the breakpoint check here means individual dialogs bind `:fullscreen` without ever reading the viewport themselves.

## Key elements

- **`useFullscreenDialog(): Ref<boolean>`** — Returns Vuetify's `useDisplay().mobile` ref (true below the `sm` breakpoint, reactive to resize). The sole export; bind it directly to `v-dialog`'s `:fullscreen` prop.

## Relationships

- No graph neighbors. This composable has no project-internal imports; its only dependency is the external `vuetify` package (`useDisplay`).

## Notes

- This is intentionally the *only* place the `sm` breakpoint is consulted for dialog sizing. If a dialog reads `useDisplay()` or a custom media query itself, it violates the convention stated in the module docblock.
- The returned value is the raw Vuetify `mobile` ref — it is not wrapped, debounced, or cached. Mutations to Vuetify's display state (e.g. in tests) propagate directly.
- The file imports `Ref` from Vue only for the return-type annotation; the composable has no local state or side effects.
