---
source: src/ui/molecules/page-size-options.ts
sha256: 1d136aa0376a62ae9965fcdabd9ee0811471c80855e390a4d1c8f4badb370fc1
signature: ef69c38e4bcb9dd1ad1272d5516653b7f65ed7f3d919af1e915f6a28ccacaf42
generated_at: 2026-11-10T06:29:24.732416+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/page-size-options.ts

## Purpose

Exports the default set of page-size options (10, 25, 50) used across the app's list views. It lives in its own module because Vue's `<script setup>` in `PageSizeSelect.vue` cannot expose a runtime named export that other callers might import independently of the component.

## Key elements

- **`DEFAULT_PAGE_SIZES`** (`number[]`) — The standard row-count choices (`[10, 25, 50]`) every list in the app offers unless a caller supplies its own set.

## Relationships

- **`src/ui/molecules/PageSizeSelect.vue`** — Consumes `DEFAULT_PAGE_SIZES` as the default option list for its dropdown.

## Notes

- This file is intentionally minimal: a single constant with no logic. Import it as a named export (`import { DEFAULT_PAGE_SIZES } from '…'`) rather than reaching into the component.
