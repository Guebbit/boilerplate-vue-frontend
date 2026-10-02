---
source: src/app/views/AboutPage.vue
sha256: 774f4ac19bb3cc797c53d38ba5ef98b9988ed01a8c79cfd14c8d9e91745c4b76
generated_at: 2026-10-02T11:50:24.793049+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/AboutPage.vue

## Purpose

Static "About" page for the storefront. It renders the shop's self-introduction: a tagline + intro paragraphs, a feature grid ("what you can try"), a tech-stack list ("under the hood"), and a guided walkthrough with conditional CTA buttons. All copy is pulled from the i18n dictionary under `static-pages.about.*`; this file only declares structure, icon mappings, and route guards.

## Key elements

- **`FEATURES`** — readonly array of `{ key, icon }` pairs (catalogue, wishlist, cart, orders, account, contact, languages, theme). Each `key` indexes into `static-pages.about.features.<key>.title/.text`; the `icon` is a Lucide component rendered inline (not translatable).
- **`STACK`** — readonly string array of layer keys (frontend, api, contract, realtime, quality, observability) resolved against `static-pages.about.stack.<key>.title/.text`.
- **`intro` / `steps`** — computed paragraph lists built via `staticPageParagraphs(tm, rt, …)` from the dictionary.
- **`hasProductsList` / `hasSignUp`** — computed booleans that call `router.hasRoute(…)` so CTA buttons are hidden when the target route isn't registered in the current build.
- **Default export (named block)** — sets `name: 'AboutPage'` for devtools / `<KeepAlive>`; required because `<script setup>` cannot declare a component name.
- **Template sections** — four `<section>` blocks with `data-test` attributes (`about-features`, `about-stack`, `about-try`) for E2E selectors, wrapped in a `max-w-4xl` grid.

## Relationships

The dependency graph lists no neighbors, but the file imports:

- `StaticPageLinks` (`@/app/components/StaticPageLinks.vue`) — renders the shared bottom navigation, receiving `current="about"` to highlight the active link.
- `routerLinkI18n` (`@/i18n/router-link.ts`) — wraps `router-link` with i18n-aware path resolution for the CTA buttons.
- `SIGN_UP_ROUTE_NAME`, `staticPageParagraphs`, `staticPageRouteName` (`@/app/utils/static-pages.ts`, `@/app/router/navigation.ts`) — route-name constants and the paragraph-list resolver used by the computed properties.
- `lucide-vue-next` — icon components used in the feature grid and the "products" CTA arrow.

## Notes

- The dual `<script>` + `<script setup>` pattern is intentional: the plain block exists solely to provide a stable component `name` for devtools and `<KeepAlive>`.
- CTA visibility is **build-time conditional** via `router.hasRoute`; a build that omits the products or auth modules simply won't render those buttons — no runtime error.
- Feature/stack **keys** are hardcoded here (they are structural identifiers, not user-facing text); only titles and descriptions go through i18n.
- The `eslint-disable` comment on the `useI18n()` destructure is load-bearing — removing it will trigger an `@typescript-eslint/unbound-method` warning because vue-i18n's composer self-binds the destructured functions.
