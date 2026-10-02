---
source: src/app/views/Error.vue
sha256: be428b33d49593642e7117e02b88f1a37cf171726c5a6fa73b42de2886147ee8
generated_at: 2026-10-02T11:50:41.748285+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/Error.vue

## Purpose

A generic, catch-all error page rendered when the router's `onError` handler redirects an unhandled failure here. It displays the supplied HTTP-like status and a (validated) translated message, and offers a single "Home" action so the user can recover.

## Key elements

- **Named component block** (`export default { name: 'ErrorPage' }`) — required because `<script setup>` cannot declare a component name; enables `<KeepAlive>` matching and devtools readability.
- **Props** — `status?: string` (displayed in the heading) and `message?: string` (an i18n key like `error-page.*` or `navigation.*`, or free text).
- **`normalizedMessage` (computed)** — runs `isKnownErrorMessage(message)`; if the value is a recognised key it translates it, otherwise it falls back to `GENERIC_ERROR_KEY`. Guarantees the template never renders arbitrary user-supplied text.
- **Template** — uses `PageHeader` for the title, Vuetify's `v-empty-state` for the body, a `SearchX` lucide icon as media, and a `v-btn` that navigates to the `Home` route via `routerLinkI18n`.

## Notes

- **Defensive double-check.** `router/index.ts`'s `onError` already maps unknown messages to `GENERIC_ERROR_KEY` before redirecting, but this view re-validates `message` via `isKnownErrorMessage` to guard against a hand-typed URL that bypasses the router guard.
- **Layout contract.** The route's `meta.customHero` flag tells `LayoutDefault` to suppress its own hero section; this page provides a richer header (status + translated title) in its place.
- **Dual `<script>` blocks.** The non-setup block exists solely to set `name`; all logic lives in `<script setup>`. Removing the named block would break `<KeepAlive>`-based caching of this page.
