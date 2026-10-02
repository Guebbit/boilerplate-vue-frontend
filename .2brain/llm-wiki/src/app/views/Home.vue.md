---
source: src/app/views/Home.vue
sha256: d5af47b8651afc4d4abc14849f6548f9cc453003eb6db966d48c76c12c93d134
generated_at: 2026-10-02T11:51:28.834749+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/Home.vue

## Purpose

Landing page of the application. Renders a static hero with a conditional call-to-action button and a three-card showcase grid. All copy is i18n-driven; the single cross-domain link (to the products list) is guarded at runtime so the page degrades gracefully when the products module is absent from the build.

## Key elements

- **`export default { name: 'HomePage' }`** — Named component block (separate `<script>` from `<script setup>`) so DevTools and `<KeepAlive>` can identify the component.
- **`hasProductsList`** — `computed` wrapping `router.hasRoute('ProductsList')`. Gates the hero CTA button with `v-if`; without it the button would navigate to a non-existent route after the products module is removed.
- **`featuredProducts`** — `computed` array of three `{ title, description, accent, icon }` objects. Re-evaluated on locale change via `t()`. Icons are `lucide-vue-next` components (`Package`, `Tag`, `Star`).
- **`routerLinkI18n`** (imported from `@/i18n/router-link.ts`) — Builds a locale-aware `to` object for the CTA `<v-btn>`.
- **`CardInfo`** (imported from `@/ui/organisms/CardInfo.vue`) — Presentational card organism rendered in the showcase grid; receives `title`, `description`, `accent`, and a slot-provided icon.
- **`.hero-card` scoped style** — Radial-gradient glow using `--v-theme-primary` / `--v-theme-secondary` CSS custom properties so the accent follows the active Vuetify theme.

## Relationships

No graph neighbors are registered for this file. At the import level it depends on:

- `@/ui/organisms/CardInfo.vue` — renders each showcase card.
- `@/i18n/router-link.ts` — provides `routerLinkI18n` for the CTA link.
- `@/ui/types.ts` — supplies the `ThemeAccent` type used in the `featuredProducts` shape.

It is a leaf in the view layer: nothing is expected to import *from* this file.

## Notes

- The products CTA is the **only** place the app shell references a domain-specific route name as a plain string. Removing the `products` entry from `src/modules.ts` makes `hasRoute` return `false` and hides the button; the compiler cannot catch a missing route name here because it is a string literal, not a typed route.
- `featuredProducts` is a `computed`, not a plain array, specifically so it re-runs on locale switch. Do not replace it with a `const` array or translations will go stale.
- The named-component block (`export default { name: … }`) must stay in its own `<script>` block; `<script setup>` cannot set `name` directly.
