# src/app/views/AboutPage.vue

## Purpose

The shop's "About" page. It renders a static informational layout (intro, feature grid, tech-stack list, walkthrough with CTAs) where every visible string is pulled from the i18n dictionary under `static-pages.about.*`. The file owns only the structure, the icon/key mappings, and the conditional CTA visibility logic.

## Key elements

- **`export default { name: 'AboutPage' }`** — Named component block so devtools and `<KeepAlive>` can identify the SFC (required because `<script setup>` cannot declare `name`).
- **`FEATURES`** — Read-only array of `{ key, icon }` pairs. Keys map to `static-pages.about.features.<key>.{title,text}` in the dictionary; icons are `lucide-vue-next` components.
- **`STACK`** — Read-only array of string keys (e.g. `'frontend'`, `'api'`, `'contract'`, …) that index into `static-pages.about.stack.<key>.{title,text}`.
- **`intro` (computed)** — Resolves the multi-paragraph intro via `staticPageParagraphs(tm, rt, …)`.
- **`steps` (computed)** — Resolves the ordered walkthrough steps the same way.
- **`hasProductsList` / `hasSignUp` (computed)** — Guard the two primary CTAs by checking `router.hasRoute(…)` so they only render when the target route exists in the current build.
- **Template sections** — Four `<v-card>`-wrapped blocks (Intro, Features grid, Stack `<dl>`, Walkthrough + CTA buttons) followed by a `StaticPageLinks` footer card. Each feature/stack item is rendered with a dynamic `t()` lookup built from the key arrays.

## Relationships

No graph neighbors are recorded for this file. At runtime it consumes:

- `LayoutDefault` (page shell / `<v-app-bar>` / footer)
- `StaticPageLinks` (cross-navigation between static pages)
- `routerLinkI18n` and `SIGN_UP_ROUTE_NAME` (route-aware links)
- `staticPageParagraphs` / `staticPageRouteName` (dictionary & route helpers)
- `vue-i18n`, `vue-router`, `lucide-vue-next`, Vuetify components

## Notes

- **Dual `<script>` blocks are intentional.** The options-API block exists *solely* to set `name`; all logic lives in `<script setup>`. Don't "simplify" by removing it — `<KeepAlive>` and devtools depend on it.
- **Icons are not translatable.** That is why the `FEATURES` and `STACK` key lists live in this file rather than in the dictionary; adding a new feature requires a new dictionary entry *and* a new entry in the array.
- **CTA conditional rendering.** The Products and Sign-up buttons are hidden (not just disabled) when their routes are absent. The FAQ button is always shown because that route is expected to exist in every build.
- **All user-facing text is i18n-driven.** There are no hard-coded strings in the template (aside from `aria-hidden` and structural attributes). Translators work exclusively in the `static-pages.about.*` namespace.
- **`data-test` attributes** (`about-features`, `about-stack`, `about-try`) are the stable hooks for e2e selectors; prefer those over class or text matching in tests.
