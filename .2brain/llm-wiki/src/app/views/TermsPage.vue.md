---
source: src/app/views/TermsPage.vue
sha256: 8811e0685718d942b6201ebd692196d99e0afe2e5573d7b69ad46c6486869d4f
signature: 1232736d1504beb50bd5d77be8a90f3f5307178a3b27d32836222dd4f2d9e901
generated_at: 2026-11-10T02:59:50.303071+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/TermsPage.vue

## Purpose

Dedicated terms-of-service page component. It exists as its own SFC (rather than reusing a shared paragraph renderer) because real legal copy requires specific structure—headings, lists, numbered clauses—that a generic renderer does not provide. It composes an operator identity block, an optional version line, a legal-content placeholder, and navigation links.

## Key elements

- **Named export `TermsPage`** (`<script lang="ts">` block) — stable component name for Vue devtools and `<KeepAlive>`; required because `<script setup>` cannot declare one.
- **`publicConfig`** (imported from `@/infrastructure/config.ts`) — provides `termsVersion` for the i18n version line; rendered only when truthy.
- **`t`** (from `vue-i18n` via `useI18n`) — translates the version string using key `static-pages.terms.version` with the `version` parameter.
- **`OperatorIdentityBlock`** — displays the operator's identity at the top of the page.
- **`LegalPlaceholder`** (`page="terms"`) — placeholder slot for the operator's actual legal copy; the repository ships no legal wording.
- **`StaticPageLinks`** (`current="terms"`) — navigation links to other static pages, highlighting the current one.

## Relationships

- **`INSTALL.md`** — listed as a graph neighbor (likely related via the operator setup / configuration step that populates `publicConfig` and replaces the legal placeholder before going live). No direct import or reference is visible in this file.

## Notes

- The two-script pattern (`<script lang="ts">` + `<script setup lang="ts">`) is intentional and minimal: the plain script block exists *only* to supply the component `name`. Do not remove it.
- `publicConfig` is optional; the version paragraph is guarded with `v-if="publicConfig"`, so the page renders even before configuration is available.
- This page intentionally contains **no** actual legal text. The operator is expected to replace `LegalPlaceholder` content (or the component itself) before production use.
