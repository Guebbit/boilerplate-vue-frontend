---
source: src/app/views/PrivacyPage.vue
sha256: 25de5b889ff5e50b48ade3d76e9dd054d2540414e02ddbbc09f7d1bbbc4e212c
signature: 2dd79398cf61b19d94dc7fa15492e49c25e3cde79b880594f4f14517eabb112f
generated_at: 2026-11-10T02:59:38.239125+00:00
model: ollama:qwen3.8:27b
---

# src/app/views/PrivacyPage.vue

## Purpose

A dedicated privacy-policy page rendered as its own Vue SFC. It exists separately from the shared paragraph renderer because real policy copy needs structure (headings, data-category tables) that a generic paragraph list cannot express. The page combines operator identity, a replaceable legal placeholder, i18n-driven prose, a code-generated storage table, and cross-page links.

## Key elements

- **`export default { name: 'PrivacyPage' }`** — Options-API block that gives the SFC a stable `name` for devtools and `<KeepAlive>` (not possible in `<script setup>` alone).
- **`paragraphs` (computed)** — Resolves the i18n key `static-pages.privacy.paragraphs` into an array of strings via `staticPageParagraphs(tm, rt, …)`.
- **`OperatorIdentityBlock`** — Renders the controller's identity (GDPR Art. 13(1)(a)).
- **`LegalPlaceholder` (page="privacy")** — A placeholder the operator is expected to replace with real legal wording before going live; the repo ships no legal text.
- **`BrowserStorageTable`** — Code-generated table of cookies/storage entries; remains accurate even after the placeholder is replaced.
- **`StaticPageLinks` (current="privacy")** — Cross-navigation links to sibling static pages.
- **`staticPageParagraphs`** (from `@/app/utils/static-pages.ts`) — Helper that fetches and resolves the raw paragraph list from vue-i18n.

## Relationships

- **INSTALL.md** — Documents the operator's pre-launch checklist, which includes replacing the `LegalPlaceholder` block with actual legal copy. This file is the component that placeholder lives in.

## Notes

- The file uses the two-script-block pattern (`<script>` + `<script setup>`) solely to attach a `name` for `KeepAlive`; all logic lives in `<script setup>`.
- The `eslint-disable-next-line @typescript-eslint/unbound-method` on the `useI18n()` destructuring is intentional: vue-i18n's composer binds `tm`/`rt` internally, so the unbound-method rule is a false positive.
- The repository ships **no** legal wording. The `LegalPlaceholder` block and the i18n paragraph key are placeholders the operator must populate; only `BrowserStorageTable` is "real" content generated from code.
- All human-readable copy is resolved through the `static-pages.privacy.*` i18n namespace—editing text means updating the locale files, not this component.
