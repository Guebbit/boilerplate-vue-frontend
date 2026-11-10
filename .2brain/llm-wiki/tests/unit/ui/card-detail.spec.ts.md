---
source: tests/unit/ui/card-detail.spec.ts
sha256: c30270c953cab16a18a507bf7a76eac97de8acc3bebb806d84e23e1c4fac891f
signature: bcc10599fb023dd1836f56828f07082f200b405be7555d7652792591e6f0ecf1
generated_at: 2026-11-10T08:23:59.603143+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/card-detail.spec.ts

## Purpose
Unit tests for the `CardDetail.vue` organism, verifying that the conditional heading (title, optional subtitle, and `title-actions` slot) renders correctly and that the card remains a bare shell when no `title` is provided.

## Key elements
- **`mountCard`** — local helper that mounts `CardDetail` via `@vue/test-utils` with arbitrary props/slots and the shared Vuetify plugin. Defaults include a `<p data-test="body">` in the default slot.
- **`describe('CardDetail heading')`** — single test block with three cases:
  - No `<h3>` and no subtitle when `title` is absent; body still renders.
  - `title` renders as an `<h3>`; `subtitle` renders as `p.mt-1` only when explicitly passed.
  - The `title-actions` slot content appears beside the heading when a `title` is present.

## Relationships
No graph neighbors are registered for this file.

## Notes
- All heading assertions depend on the presence of a `title` prop; tests without it only check absence of the heading and presence of the body slot.
- The `title-actions` slot test passes a raw HTML string (`'<button …>'`) rather than a render function, which works with `@vue/test-utils` string slots but would not execute JS.
