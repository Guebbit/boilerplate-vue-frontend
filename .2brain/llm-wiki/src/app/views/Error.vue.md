---
source: src/app/views/Error.vue
sha256: be428b33d49593642e7117e02b88f1a37cf171726c5a6fa73b42de2886147ee8
signature: 352a291a49a276351153b06b1f7958c4c05596460df4135569d6f7a7e41cd890
generated_at: 2026-11-10T02:58:54.029904+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/Error.vue

## Purpose

Generic error page rendered when the router's `onError` handler (in `router/index.ts`) redirects the user here with a status code and a message. It displays the status in the heading, a safely-resolved translated message, and a "back to Home" action.

## Key elements

- **Named component block (`export default { name: 'ErrorPage' }`)** — separate `<script>` block that supplies the SFC's name for devtools and `<KeepAlive>`, since `<script setup>` cannot declare one.
- **`defineProps<{ status?: string; message?: string }>()`** — accepts route params: an HTTP-like status string and a message that is either a known i18n key or free text.
- **`normalizedMessage` (computed)** — runs `isKnownErrorMessage(message)`; if the message is a recognized key it translates it, otherwise falls back to `GENERIC_ERROR_KEY`. Guarantees the user never sees raw/arbitrary text from a hand-typed URL.
- **Template** — `PageHeader` with the status, a `v-empty-state` (with a 72 px `SearchX` lucide icon) showing the normalized message, and a primary `v-btn` linking to `Home` via `routerLinkI18n`.

## Relationships

No graph neighbors are documented for this file. It does import `PageHeader`, `vue-i18n`, `lucide-vue-next`, `routerLinkI18n`, and the `GENERIC_ERROR_KEY` / `isKnownErrorMessage` helpers, but none of those are tracked as graph neighbors in this wiki.

## Notes

- The route's `meta.customHero` flag (set in `router/index.ts`) tells `LayoutDefault` to suppress its own hero section, since this page provides its own richer header with the status code.
- The `message` prop defaults to `''`, which will fail `isKnownErrorMessage` and always resolve to the generic fallback — safe even if a user hand-types a bogus param into the URL.
- The two-script-block pattern (plain options + `setup`) is intentional and non-negotiable here: it exists solely to attach `name` to the component while keeping the rest in composition API.
