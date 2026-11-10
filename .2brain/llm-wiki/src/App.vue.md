---
source: src/App.vue
sha256: 522d351f8c1d13673caae25a1a69a7808447c7d4d0ad493e9991135b5d0cf65c
signature: 522d351f8c1d13673caae25a1a69a7808447c7d4d0ad493e9991135b5d0cf65c
generated_at: 2026-11-10T02:48:56.234521+00:00
model: ollama:qwen3.8:27b
---

# src/App.vue

## Purpose

The composition root of the application. It renders the active route (`RouterView`) and two app-wide concerns that must live outside any individual page: an accessibility live region that announces route changes to screen readers, and the browser address-bar theme colour. It is deliberately kept minimal so that no domain-specific state outlives the feature folder it originally came from.

## Key elements

- **`useThemeColorMeta()`** — called at setup; keeps the browser's address-bar colour in sync with the active Vuetify theme. Imported from `@/ui/composables/use-theme-color-meta.ts`.
- **Route announcer (`routeAnnouncement`)** — a reactive value written by the router after each navigation; rendered into a `<p role="status" aria-live="polite">` element so assistive technology announces the new page title. Imported from `@/app/router/announcer.ts`.
- **`<RouterView />`** — the single outlet where routed page components are mounted.

## Relationships

- **`src/main.ts`** — installs the app-level dependencies (Pinia, router, i18n, Vuetify) *before* this component mounts. This file assumes those are already wired up; it does not import or configure them itself.
- **`src/ui`** — provides `useThemeColorMeta`, the sole import from the UI layer. The composable is invoked here (not in a page) so the theme-colour side-effect applies globally and persists across route swaps.
- **`README.md`** — project-level documentation; this file is the component it points to as the entry view. No runtime dependency.

## Notes

- The doc comment is explicit: this is the **first file every derived project opens**, so any state parked here survives the deletion of the feature folder it originated from. Prefer putting state in the feature or in `src/kernel/registry.ts`.
- The live region must exist *before* the first page mounts and *survive* the swap between two pages. Moving it into a layout or page component would cause screen readers to miss the announcement because the region is re-created with each page.
- The `data-test="route-announcer"` attribute is the stable selector for e2e tests that assert the announcement text.
