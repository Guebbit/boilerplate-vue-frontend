# src/app/views/Error.vue

## Purpose

Generic full-page error view rendered when the router redirects with a status and message (e.g. an uncaught error or a rejected navigation). It displays the status, a human-readable message, and a single "Go Home" action.

## Key elements

- **Component `ErrorPage`** — declared in the options block; the `<script setup>` block carries all logic.
- **Props** — `status?: string` (shown in the heading and as the empty-state title) and `message?: string` (default `''`, the text or i18n key to display).
- **`normalizedMessage`** (computed) — returns `t(message)` when the string starts with `error-page.` or `navigation.`, otherwise passes the raw string through unchanged (router `onError` payloads are free-form).
- **Template** — wraps content in `LayoutDefault` (`centered`), uses Vuetify's `v-empty-state` with a `SearchX` icon and a `v-btn` linking to the `Home` route via `routerLinkI18n`.

## Relationships

- Imports `LayoutDefault` (`@/app/layouts/LayoutDefault.vue`) as the page shell.
- Imports `routerLinkI18n` (`@/infrastructure/i18n/router-link.ts`) to build the localized Home link.
- Depends on the `vue-i18n` plugin (`useI18n`) and Vuetify's `v-empty-state` / `v-btn` components (assumed available globally).
- No other graph neighbors are recorded.

## Notes

- **Heuristic i18n detection** — the component does not receive a flag; it guesses that a string is an i18n key purely by its `error-page.` / `navigation.` prefix. Any new message prefix must be added to this check or it will render verbatim.
- **Dual `<script>` blocks** — an empty options block (`name: 'ErrorPage'`) sits alongside `<script setup>`. This is the idiomatic way to set a component name in Vue 3 SFCs but is easy to miss when grepping.
- The `status` prop is rendered directly in the `<h1>` and as the `v-empty-state` title, so it is expected to be a short token (e.g. `404`, `500`) rather than a sentence.
