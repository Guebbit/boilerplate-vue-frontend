# src/App.vue

## Purpose

The composition root of the application. It renders the active route and a single persistent screen-reader live region. By design it holds no domain state, no layout chrome, and no business logic — everything else is installed by `src/main.ts` or contributed via the kernel registry. It exists so derived projects have one trivially small file to open first without inheriting stale state from a previous domain folder.

## Key elements

- **`<RouterView />`** — renders whatever component the current route resolves to.
- **`routeAnnouncement`** (from `@/app/router/announcer.ts`) — a reactive value the router writes the new page's title into after each navigation.
- **`<p class="sr-only" role="status" aria-live="polite" aria-atomic="true">`** — the live region that reads `routeAnnouncement` aloud. It is outside any layout component so it is created once, before the first page mounts, and is never torn down when the route swaps. Carries `data-test="route-announcer"` for E2E assertions.

## Relationships

- **`src/main.ts`** — bootstraps the app (installs Pinia, the router, i18n, Vuetify) and mounts `App.vue` as the root component. This file is the component it renders.
- **`index.html`** — the document shell that loads `main.ts`; indirectly the host for this component's rendered DOM.

## Notes

- The JSDoc block in `<script setup>` is a project convention: it documents *why* this file is nearly empty and warns contributors not to park state here.
- The live region must remain a sibling of `<RouterView />`, not a child of any page component. If it were created inside a page, screen readers would miss it on the first navigation because the region does not yet exist when the title is written.
- `aria-atomic="true"` ensures the entire new title is announced as one chunk rather than character-by-character.
