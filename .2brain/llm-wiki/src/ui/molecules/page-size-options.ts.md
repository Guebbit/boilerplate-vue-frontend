---
source: src/ui/molecules/page-size-options.ts
sha256: 1d136aa0376a62ae9965fcdabd9ee0811471c80855e390a4d1c8f4badb370fc1
generated_at: 2026-10-17T01:58:05.820898+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/page-size-options.ts

## Purpose

Provides the standard page-size options (`[10, 25, 50]`) as a standalone named export. It lives in its own `.ts` file because Vue's `<script setup>` cannot expose a runtime named export that a caller might import independently of the component.

## Key elements

- **`DEFAULT_PAGE_SIZES`** (`[10, 25, 50]`) — The default row-count choices offered to every paginated list in the app unless a caller overrides them.

## Relationships

- **`src/ui/molecules/PageSizeSelect.vue`** — Consumes `DEFAULT_PAGE_SIZES` as its default options array.

## Notes

- This is the *default* set; the admin audit log intentionally passes a larger set of page sizes instead of using this constant.
- The sole reason this file exists as a separate module (rather than a `const` inside `PageSizeSelect.vue`) is the `<script setup>` limitation on named exports.
