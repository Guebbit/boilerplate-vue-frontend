# src/app/views/Home.vue

## Purpose

The app's landing page. Renders a static hero card (title, description, optional CTA) and a three-card showcase grid, all translated via i18n. The CTA link is conditionally hidden when the `products` domain is excluded from the build.

## Key elements

- **`export default { name: 'HomePage' }`** — Named component block; required alongside `<script setup>` so devtools and `<KeepAlive>` can identify the component.
- **`hasProductsList`** (computed) — Boolean from `router.hasRoute('ProductsList')`. Guards the hero CTA button so the page doesn't render a dead link when the products module is stripped.
- **`featuredProducts`** (computed) — Array of three `{ title, description, variant, icon }` objects. Re-evaluates on locale change because titles/descriptions come from `t()`. Icons are `Package`, `Tag`, `Star` from `lucide-vue-next`; variants map to `ThemeAccent` values (`primary`, `secondary`, `tertiary`).
- **Template** — Wraps content in `LayoutDefault`, uses a Vuetify `v-card` hero and a responsive grid of `CardInfo` organisms. The CTA `v-btn` is rendered only when `hasProductsList` is true and navigates via `routerLinkI18n({ name: 'ProductsList' })`.
- **Scoped style `.hero-card`** — Layered radial gradients keyed to `--v-theme-primary` / `--v-theme-secondary` CSS custom properties for a soft, theme-aware glow.

## Relationships

No graph neighbors are recorded for this file. It imports from `@/app/layouts/LayoutDefault.vue`, `@/ui/organisms/CardInfo.vue`, `@/ui/types.ts`, `@/infrastructure/i18n/router-link.ts`, and standard libraries (`vue`, `vue-i18n`, `vue-router`, `lucide-vue-next`), but none of those appear as explicit graph edges.

## Notes

- **Two `<script>` blocks is intentional.** The plain `<script>` exists solely to set `name`; `<script setup>` cannot declare a component name on its own.
- **`hasProductsList` guard exists because the route name is a string.** Removing the `products` module from `src/modules.ts` will not produce a compile or type error—the link would simply resolve to a non-existent route at runtime. The computed check is the only safety net.
- **`featuredProducts` recomputes on every locale switch** because `t()` is called inside the computed. The array shape is stable; only the strings change.
- **The page is the one allowed cross-domain reference point.** The hero CTA is the single place the app shell links into a domain (`ProductsList`); everything else on the page is self-contained or uses shared UI components.
