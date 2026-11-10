---
source: src/app/views/AboutPage.vue
sha256: 8e13125a9c767d639f5b21555b4a2f1a937508f1cf56bdb19566ecfc003b3003
signature: 1b2a88663e9cc22c93c8082a20c117ddfd5331de0dbbc9e943d4520f4836ea69
generated_at: 2026-11-10T02:58:42.488494+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/AboutPage.vue

## Purpose

Renders the storefront's "About" page: an intro blurb, a feature grid showcasing what the shop offers, a tech-stack description, and a short guided walkthrough with call-to-action buttons. All human-readable text is pulled from the i18n dictionary under `static-pages.about.*`; this file only defines structure, icon pairings, and key names.

## Key elements

- **Named `<script>` block** – Declares `name: 'AboutPage'` so the component is identifiable in DevTools and works with `<KeepAlive>` (not possible in `<script setup>` alone).
- **`FEATURES` (readonly array)** – Eight `{ key, icon }` pairs mapping feature slugs (e.g. `catalogue`, `wishlist`) to their `lucide-vue-next` icon components. Titles and descriptions are read from `static-pages.about.features.{key}.*`.
- **`STACK` (readonly string array)** – Six layer slugs (`frontend`, `api`, `contract`, `realtime`, `quality`, `observability`) whose title/text come from `static-pages.about.stack.{key}.*`.
- **`intro` / `steps` (computed)** – Resolve raw paragraph lists via `staticPageParagraphs(tm, rt, …)` from the i18n composer's `tm`/`rt` helpers.
- **`hasProductsList` / `hasSignUp` (computed)** – Call `router.hasRoute(…)` to conditionally render the two primary CTAs only when those routes exist in the current build.
- **Template** – Four Vuetify `v-card` sections (intro, features grid, stack `<dl>`, walkthrough `<ol>` + CTAs) plus a `StaticPageLinks` footer. CTAs navigate via `routerLinkI18n`.

## Relationships

No graph neighbors are recorded for this file. It imports shared utilities (`staticPageParagraphs`, `staticPageRouteName`, `routerLinkI18n`, `SIGN_UP_ROUTE_NAME`), the `StaticPageLinks` component, and icon components from `lucide-vue-next`, but those are leaf imports with no further coupling noted.

## Notes

- **Dual script blocks are intentional.** The plain `<script>` exists solely to supply `name`; removing it breaks DevTools labeling and any `<KeepAlive>` cache by name.
- **Icon keys are local; text is not.** The `key` strings in `FEATURES` and `STACK` are the only non-translatable identifiers in the page. If you add a feature, you must add both a dictionary entry *and* an entry in the array.
- **CTA visibility is route-gated, not flag-gated.** `router.hasRoute` is the single source of truth; there is no feature-flag system here. If a route is absent, the button simply does not render.
- **`tm`/`rt` destructuring** triggers an ESLint `unbound-method` suppression because vue-i18n's composer binds them internally. Do not "fix" this warning without understanding that.
- **`data-test` attributes** (`about-features`, `about-stack`, `about-try`) exist for e2e selectors; keep them stable.
