# src/app/views/StaticPage.vue

## Purpose

A single Vue component that renders all prose-based static pages (About, FAQ, Terms, Privacy) in the shop. All copy lives in i18n locale dictionaries under `static-pages.<page>`, so localisation or content changes require editing dictionaries rather than touching this component.

## Key elements

- **`page` prop** (`'about' | 'faq' | 'terms' | 'privacy'`) — selects which `static-pages.*` dictionary block this instance renders.
- **`messageList(path)`** — wraps `tm()` to safely return an array; returns `[]` when the dictionary has no list at that path (e.g. prose-only pages have no `entries`), preventing a blank-page bug from a bare `{}`.
- **`paragraphs` (computed)** — the page's body text, one `rt()`-resolved string per paragraph.
- **`entries` (computed)** — FAQ question/answer pairs (`{question, answer}`); empty array on non-FAQ pages.
- **`siblings` (computed)** — the three static pages other than the current one, used to build the cross-link nav.
- **Template** — wraps content in `LayoutDefault`; renders paragraphs as `<p>` blocks, an optional `v-expansion-panels` block (guarded by `v-if="entries.length > 0"`, `data-test="faq-entries"`), and a bottom `<nav>` with `RouterLink` cross-links to sibling pages via `routerLinkI18n`.

## Relationships

No graph neighbours are recorded. The component imports:

- `@/app/layouts/LayoutDefault.vue` — page chrome (title, layout).
- `@/infrastructure/i18n/router-link.ts` (`routerLinkI18n`) — builds locale-aware route objects for the sibling cross-links.
- `vue-i18n` (`useI18n`) — provides `t`, `tm`, `rt` for dictionary lookups.

## Notes

- `tm()` returns `{}` (an object) for a missing key; `messageList` guards against this by checking `Array.isArray` before mapping. Without the guard, prose-only pages would crash or render blank.
- The `rt` call (rich-text interpolation) is applied to each individual paragraph/entry, not to the whole array — this is intentional so that per-paragraph formatting tokens are resolved independently.
- The `eslint-disable-next-line` on `useI18n` destructuring is required by vue-i18n's documented pattern; do not "fix" the unbound-method warning.
- The route name for cross-links is derived by capitalising the first letter of the page name (`about` → `About`, then prefixed `Static`) and passed through `routerLinkI18n`. Adding a new static page means adding a new route with that naming convention.
