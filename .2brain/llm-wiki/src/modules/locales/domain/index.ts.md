---
source: src/modules/locales/domain/index.ts
sha256: bf16ba9847163ffc46ae6e1b953cd120fc5f7cf782bfcfaac881d4623cebfa58
signature: bf16ba9847163ffc46ae6e1b953cd120fc5f7cf782bfcfaac881d4623cebfa58
generated_at: 2026-11-10T04:40:26.347986+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/domain/index.ts

## Purpose

Barrel entry point for the **locales domain layer**. It re-exports the public API of `./translation-drafts` so that consumers (views, services, tests) import from a single stable path without reaching into internal files. The module doc declares this layer as pure domain logic, explicitly free of Vue, Pinia, axios, and all other tiers.

## Key elements

- **`toUpdateEntityTranslationsBody`** (function re-export from `./translation-drafts`) — builds the request/update body for entity translations.
- **`TranslationDrafts`** (type re-export from `./translation-drafts`) — the draft-collection type used across the locale editing flow.
- **`@module` JSDoc tag** — marks the file as a module and documents the layer contract (no framework imports, per `docs/theory/domain-layer.md`).

## Relationships

- **`src/modules/locales/domain/translation-drafts.ts`** — the sole source of both re-exports; this file adds no logic of its own.
- **`src/modules/locales/views/EntityTranslations.vue`** — view-layer consumer that imports the translation-drafts API through this barrel.
- **`src/modules/locales/tests/translation-drafts.spec.ts`** — unit tests targeting the implementation in `translation-drafts.ts` (indirectly covered via this barrel's public surface).

## Notes

- This file contains **only re-exports**; no local logic. When adding a new domain function, implement it in a sibling module file and add the re-export here.
- The "lint-guaranteed free of Vue, Pinia, axios and every tier" comment implies an ESLint (or similar) rule enforces the layer boundary. Importing a framework here would be a build/lint failure.
- See `docs/theory/domain-layer.md` for the full architectural rationale behind this tier.
