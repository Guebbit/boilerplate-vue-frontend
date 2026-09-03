# src/app/views/Error.vue

## Purpose

A generic, single-purpose error page rendered when the router redirects to an error state. It displays a status code and a message (either an i18n key or free-form router error text) inside the default layout, and offers a "Home" button to recover.

## Key elements

- **`export default { name: 'ErrorPage' }`** — Separate `<script>` block that assigns a stable component name for devtools and `<KeepAlive>` (not possible inside `<script setup>`).
- **`defineProps<{ status?, message? }>()`** — Accepts optional `status` and `message` strings supplied by the route definition.
- **`normalizedMessage` (computed)** — If `message` begins with `error-page.` or `navigation.`, it is treated as an i18n key and passed through `t()`; otherwise it is rendered as-is (covers free-form text from `router.onError`).
- **Template** — Wraps content in `LayoutDefault` (centered), uses Vuetify's `<v-empty-state>` for the icon/title/text/actions layout, shows a `SearchX` icon, and a `v-btn` that navigates to the `Home` route via `routerLinkI18n`.

## Relationships

No graph-registered neighbors. The file imports `LayoutDefault`, `vue-i18n`, `vue`, `lucide-vue-next`, and `routerLinkI18n`, but none of those modules list this file as a dependent in the dependency graph.

## Notes

- The dual `<script>` + `<script setup>` pattern is intentional: the non-setup block exists solely to attach the `name` option. Do not merge them.
- The i18n-key detection in `normalizedMessage` is a prefix check (`error-page.`, `navigation.`), not a lookup. If a new error-namespace key is added, it must use one of those two prefixes or it will be rendered verbatim.
- `status` is rendered as a bare string (e.g. "404", "500"); it is not translated.
