---
source: src/app/views/LegalPage.vue
sha256: 536693ac220b169a32f18d3f25d34765a21a973a22a02aba2737c5bbceaeff3f
signature: d93fcb75416f3d669082df92a0d5cf55cce7cd1bec5b6a31d49f8c0578c2d9a9
generated_at: 2026-11-10T02:59:28.324377+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/LegalPage.vue

## Purpose

A static legal-notice page that displays the operator's full identity and a one-line introduction. The identity data is not hardcoded here; it is sourced from `GET /config` (set via `NODE_LEGAL_*` at deployment time), so every page rendering it stays in sync without local duplication.

## Key elements

- **`export default { name: 'LegalPage' }`** — Options-API block that assigns a stable component name (required for devtools and `<KeepAlive>` since `<script setup>` cannot declare one).
- **`useI18n()` / `t('static-pages.legal.intro')`** — Provides the single translated introduction line; all other content is delegated to child components.
- **`<OperatorIdentityBlock />`** — Renders the operator identity (name, address, contact) pulled from the site config.
- **`<StaticPageLinks current="legal" />`** — Footer navigation linking to sibling static pages (legal, privacy, etc.).
- **Template structure** — A Vuetify `<v-card>` (`max-w-2xl`) centered on the page, wrapped in a `#static-page-legal` anchor for in-page scrolling.

## Relationships

No dependency-graph neighbors are tracked for this file.

## Notes

- The page contains essentially no static prose of its own beyond the i18n intro line; all substantive content lives in `OperatorIdentityBlock`. If you change the displayed identity, update the `NODE_LEGAL_*` environment values, not this file.
- The dual `<script>` + `<script setup>` pattern is intentional and required by Vue for naming a `<script setup>` SFC; do not collapse them into a single block.
