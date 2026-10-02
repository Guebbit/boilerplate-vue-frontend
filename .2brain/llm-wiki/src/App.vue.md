---
source: src/App.vue
sha256: 0883a3fb1bec5505dcda61e030e1fdda04fc69370202ac6d30cbcbebcb1ad7b2
generated_at: 2026-10-02T11:42:08.045376+00:00
model: ollama:qwen3.8:27b
---

# src/App.vue

## Purpose

The root Vue component (composition root) for the application. It is deliberately minimal: it renders the routed view and a single accessibility live region. All global plugins (Pinia, router, i18n, Vuetify) are installed by `src/main.ts`; no domain-specific state or logic is placed here.

## Key elements

- **`<RouterView />`** — the single outlet where the matched route component renders.
- **`routeAnnouncement`** (imported from `@/app/router/announcer.ts`) — a reactive string the router writes after each navigation; displayed in a `role="status"` / `aria-live="polite"` paragraph so screen readers announce the new page title.
- **`data-test="route-announcer"`** attribute — stable selector for automated accessibility tests.

## Relationships

- **`src/main.ts`** — mounts this component as the root of the application and installs all global plugins before doing so. App.vue assumes those plugins are already available and does not configure them itself.

## Notes

- The live-region `<p>` must live in this file, *outside* every layout, because it needs to exist before the first page mounts and persist across route swaps. If it were re-created with a page component, screen readers would never announce the change.
- Treat this file as append-only for cross-cutting concerns (like the announcer). If you find yourself adding domain state or component logic here, it belongs in a feature module or a layout instead.
